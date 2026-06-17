# backend_api/main.py
# Chạy: python -m uvicorn backend_api.main:app --host 127.0.0.1 --port 8000 --reload

import uuid, time, hashlib, json, tempfile, os, shutil
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import merkle_rs  # Rust module qua PyO3

app = FastAPI(title="CertiChain Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory PoW Blockchain ───────────────────────────────────────
DIFFICULTY = 4

def _calc_hash(block: dict) -> str:
    s = json.dumps({
        "index":        block["index"],
        "data":         block["data"],
        "previousHash": block["previousHash"],
        "nonce":        block["nonce"],
        "timestamp":    block["timestamp"],
    }, sort_keys=True)
    return hashlib.sha256(s.encode()).hexdigest()

def _mine(block: dict) -> dict:
    target = "0" * DIFFICULTY
    start  = time.time()
    while True:
        h = _calc_hash(block)
        if h.startswith(target):
            block["hash"]       = h
            block["miningTime"] = round(time.time() - start, 2)
            return block
        block["nonce"] += 1

def _make_genesis():
    b = {"index": 0, "data": {"message": "Genesis Block"},
         "previousHash": "0", "nonce": 0,
         "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
         "miningTime": 0, "hash": ""}
    b["hash"] = _calc_hash(b)
    return b

def _validate(blocks):
    target = "0" * DIFFICULTY
    for i in range(1, len(blocks)):
        c, p = blocks[i], blocks[i-1]
        if c["hash"] != _calc_hash(c): return False
        if c["previousHash"] != p["hash"]: return False
        if not c["hash"].startswith(target): return False
    return True

chain_state = {"blocks": [_make_genesis()], "length": 1, "valid": True, "difficulty": DIFFICULTY}


# ════════════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    return {"status": "online", "service": "CertiChain Backend",
            "blockchain_length": chain_state["length"]}

# ── Hash file ──────────────────────────────────────────────────────
@app.post("/api/hash/file")
async def hash_file(file: UploadFile = File(...)):
    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(content); tmp = f.name
    try:
        h = merkle_rs.hash_file_hex(tmp)
    finally:
        os.unlink(tmp)
    return {"fileName": file.filename, "documentHash": "0x" + h}

# ── Build Merkle batch ─────────────────────────────────────────────
@app.post("/api/merkle/build")
async def build_merkle(files: List[UploadFile] = File(...)):
    tmp_dir = tempfile.mkdtemp()
    try:
        for upload in files:
            data = await upload.read()
            with open(os.path.join(tmp_dir, upload.filename), "wb") as f:
                f.write(data)

        root   = merkle_rs.compute_merkle_root(tmp_dir)
        records = []
        for upload in files:
            leaf  = merkle_rs.hash_file_hex(os.path.join(tmp_dir, upload.filename))
            proof = merkle_rs.generate_proof(tmp_dir, upload.filename)
            records.append({
                "fileName":     upload.filename,
                "documentHash": "0x" + leaf,
                "proof": [{"sibling": "0x" + s, "isLeft": il} for s, il in proof],
            })
        return {"batchId": f"batch_{uuid.uuid4().hex[:8]}",
                "merkleRoot": "0x" + root,
                "fileCount": len(records), "files": records}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

# ── Verify proof ───────────────────────────────────────────────────
class VerifyReq(BaseModel):
    documentHash: str
    merkleRoot:   str
    proof:        list

@app.post("/api/merkle/verify")
def verify(req: VerifyReq):
    leaf  = req.documentHash.removeprefix("0x")
    root  = req.merkleRoot.removeprefix("0x")
    steps = [(p["sibling"].removeprefix("0x"), p["isLeft"]) for p in req.proof]
    valid = merkle_rs.verify_integrity(leaf, steps, root)
    return {"valid": valid,
            "message": "Proof valid ✓" if valid else "INVALID — file may be tampered"}

# ── Blockchain endpoints ───────────────────────────────────────────
class BatchReq(BaseModel):
    batchId: str; merkleRoot: str; documentCount: int; note: str = ""

@app.post("/api/blockchain/add-batch")
def add_batch(req: BatchReq):
    last  = chain_state["blocks"][-1]
    block = {"index": last["index"]+1,
             "data": {"batchId": req.batchId, "merkleRoot": req.merkleRoot,
                      "documentCount": req.documentCount, "note": req.note},
             "previousHash": last["hash"], "nonce": 0,
             "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
             "miningTime": 0, "hash": ""}
    chain_state["blocks"].append(_mine(block))
    chain_state["length"] = len(chain_state["blocks"])
    chain_state["valid"]  = True
    return {"chain": chain_state}

@app.get("/api/blockchain/chain")
def get_chain(): return chain_state

@app.post("/api/blockchain/validate")
def validate():
    v = _validate(chain_state["blocks"])
    chain_state["valid"] = v
    return {"valid": v, "message": "Chain valid ✓" if v else "Chain INVALID — tampering detected!"}

class TamperReq(BaseModel):
    blockIndex: int = 1; newMerkleRoot: str = "0xtampered"

@app.post("/api/blockchain/tamper")
def tamper(req: TamperReq):
    if req.blockIndex >= len(chain_state["blocks"]):
        raise HTTPException(400, "Block index out of range")
    chain_state["blocks"][req.blockIndex]["data"]["merkleRoot"] = req.newMerkleRoot
    v = _validate(chain_state["blocks"])
    chain_state["valid"] = v
    return {"chain": chain_state, "valid": v, "message": "Block tampered. Chain now INVALID."}

@app.post("/api/blockchain/reset")
def reset():
    chain_state["blocks"] = [_make_genesis()]
    chain_state.update({"length": 1, "valid": True})
    return chain_state
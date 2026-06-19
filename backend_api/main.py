# backend_api/main.py
# Chạy: python -m uvicorn backend_api.main:app --host 127.0.0.1 --port 8000 --reload

import uuid
import time
import hashlib
import json
import tempfile
import os
import shutil
from urllib.parse import quote
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import merkle_rs  # Rust module qua PyO3
from backend_api.ipfs_service import pin_file_to_ipfs
from dotenv import load_dotenv
from web3 import Web3
from eth_account.messages import encode_defunct
from fastapi.responses import StreamingResponse
import io
from backend_api.ipfs_service import pin_file_to_ipfs, fetch_and_decrypt_from_ipfs

app = FastAPI(title="CertiChain Backend API")

# ── CẤU HÌNH WEB3 & SMART CONTRACT (SEPOLIA) ────────────────────
SEPOLIA_RPC_URL = os.getenv("SEPOLIA_RPC_URL")
if not SEPOLIA_RPC_URL:
    raise RuntimeError("SEPOLIA_RPC_URL chưa được set trong .env")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
if not CONTRACT_ADDRESS:
    raise RuntimeError("CONTRACT_ADDRESS chưa được set trong .env")

# Khởi tạo Web3 kết nối tới mạng Sepolia online thông qua Node Alchemy
w3_sepolia = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))

# Định nghĩa danh sách các hàm cần tương tác (ABI Minimal) khớp với CertificateRegistry.sol
REGISTRY_ABI_MINIMAL = [
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "isAdmin",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "certId", "type": "string"}],
        "name": "getCertificate",
        "outputs": [
            {
                "components": [
                    {"internalType": "bytes32",
                        "name": "merkleRoot", "type": "bytes32"},
                    {"internalType": "string", "name": "certId", "type": "string"},
                    {"internalType": "string", "name": "certName", "type": "string"},
                    {"internalType": "string", "name": "certType", "type": "string"},
                    {"internalType": "bytes32",
                        "name": "documentHash", "type": "bytes32"},
                    {"internalType": "bytes32",
                        "name": "metadataHash", "type": "bytes32"},
                    {"internalType": "address", "name": "issuer", "type": "address"},
                    {"internalType": "address",
                        "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "issuedAt", "type": "uint256"},
                    {"internalType": "uint256",
                        "name": "expiresAt", "type": "uint256"},
                    {"internalType": "enum CertificateRegistry.CertificateStatus",
                        "name": "status", "type": "uint8"},
                    {"internalType": "string",
                        "name": "revokedReason", "type": "string"},
                    {"internalType": "string", "name": "ipfsCID", "type": "string"}
                ],
                "internalType": "struct CertificateRegistry.Certificate",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# Khởi tạo thực thể Contract để truy vấn dữ liệu từ Blockchain Sepolia
if CONTRACT_ADDRESS:
    checksum_address = w3_sepolia.to_checksum_address(CONTRACT_ADDRESS)
    registry_contract = w3_sepolia.eth.contract(
        address=checksum_address, abi=REGISTRY_ABI_MINIMAL)
else:
    registry_contract = None

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
    start = time.time()
    while True:
        h = _calc_hash(block)
        if h.startswith(target):
            block["hash"] = h
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
        if c["hash"] != _calc_hash(c):
            return False
        if c["previousHash"] != p["hash"]:
            return False
        if not c["hash"].startswith(target):
            return False
    return True


chain_state = {"blocks": [_make_genesis()], "length": 1,
               "valid": True, "difficulty": DIFFICULTY}


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
        f.write(content)
        tmp = f.name
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

        root = merkle_rs.compute_merkle_root(tmp_dir)
        records = []
        for upload in files:
            leaf = merkle_rs.hash_file_hex(
                os.path.join(tmp_dir, upload.filename))
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
    leaf = req.documentHash.removeprefix("0x")
    root = req.merkleRoot.removeprefix("0x")
    steps = [(p["sibling"].removeprefix("0x"), p["isLeft"]) for p in req.proof]
    valid = merkle_rs.verify_integrity(leaf, steps, root)
    return {"valid": valid,
            "message": "Proof valid ✓" if valid else "INVALID — file may be tampered"}

# ── Blockchain endpoints ───────────────────────────────────────────


class BatchReq(BaseModel):
    batchId: str
    merkleRoot: str
    documentCount: int
    note: str = ""


@app.post("/api/blockchain/add-batch")
def add_batch(req: BatchReq):
    last = chain_state["blocks"][-1]
    block = {"index": last["index"]+1,
             "data": {"batchId": req.batchId, "merkleRoot": req.merkleRoot,
                      "documentCount": req.documentCount, "note": req.note},
             "previousHash": last["hash"], "nonce": 0,
             "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
             "miningTime": 0, "hash": ""}
    chain_state["blocks"].append(_mine(block))
    chain_state["length"] = len(chain_state["blocks"])
    chain_state["valid"] = True
    return {"chain": chain_state}


@app.get("/api/blockchain/chain")
def get_chain(): return chain_state


@app.post("/api/blockchain/validate")
def validate():
    v = _validate(chain_state["blocks"])
    chain_state["valid"] = v
    return {"valid": v, "message": "Chain valid ✓" if v else "Chain INVALID — tampering detected!"}


class TamperReq(BaseModel):
    blockIndex: int = 1
    newMerkleRoot: str = "0xtampered"


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

# ── IPFS / Pinata ──────────────────────────────────────────────────


@app.post("/api/ipfs/pin")
async def pin_to_ipfs(file: UploadFile = File(...)):
    """
    Nhận file từ frontend → mã hoá → pin lên Pinata → trả về CID.
    """
    content = await file.read()
    if not content:
        raise HTTPException(400, "File rỗng")

    try:
        cid = await pin_file_to_ipfs(content, file.filename, file.content_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(500, f"Pinata lỗi: {str(e)}")

    return {
        "cid": cid,
        "fileName": file.filename,
    }
# ── IPFS Access Control ────────────────────────────────────────────
load_dotenv()

w3_sepolia = Web3(Web3.HTTPProvider(os.getenv("SEPOLIA_RPC_URL")))

REGISTRY_ABI_MINIMAL = [
    {
        "inputs": [{"name": "certId", "type": "string"}],
        "name": "getCertificate",
        "outputs": [{"name": "", "type": "tuple", "components": [
            {"name": "merkleRoot",    "type": "bytes32"},
            {"name": "certId",        "type": "string"},
            {"name": "certName",      "type": "string"},
            {"name": "certType",      "type": "string"},
            {"name": "documentHash",  "type": "bytes32"},
            {"name": "metadataHash",  "type": "bytes32"},
            {"name": "issuer",        "type": "address"},
            {"name": "recipient",     "type": "address"},
            {"name": "issuedAt",      "type": "uint256"},
            {"name": "expiresAt",     "type": "uint256"},
            {"name": "status",        "type": "uint8"},
            {"name": "revokedReason", "type": "string"},
            {"name": "ipfsCID",       "type": "string"},
        ]}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "isAdmin",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "isIssuer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
]

registry_contract = w3_sepolia.eth.contract(
    address=w3_sepolia.to_checksum_address(os.getenv("CONTRACT_ADDRESS")),
    abi=REGISTRY_ABI_MINIMAL
)


class FileAccessReq(BaseModel):
    certId:    str
    wallet:    str
    signature: str
    message:   str


@app.post("/api/ipfs/access")
async def get_file_access(req: FileAccessReq):
    if not registry_contract:
        raise HTTPException(
            500, "Backend chưa cấu hình CONTRACT_ADDRESS trong file .env")

    # 1. Verify chữ ký mật mã thu được từ MetaMask phía người dùng
    try:
        msg_hash = encode_defunct(text=req.message)
        recovered = w3_sepolia.eth.account.recover_message(
            msg_hash, signature=req.signature)
    except Exception:
        raise HTTPException(401, "Chữ ký mã hóa từ ví không hợp lệ")

    if recovered.lower() != req.wallet.lower():
        raise HTTPException(
            401, "Địa chỉ ví gửi lên không trùng khớp với chữ ký thực tế")

    # 2. Truy vấn trực tiếp thông tin Certificate từ Smart Contract Sepolia online
    try:
        cert = registry_contract.functions.getCertificate(req.certId).call()
    except Exception:
        raise HTTPException(
            404, "Bằng cấp (Certificate) này không tồn tại trên mạng Sepolia Testnet")

    # Lấy thông tin dựa theo chỉ mục (index) trong struct Certificate của Smart Contract (.sol)
    # index 6: issuer, index 7: recipient, index 12: ipfsCID
    issuer = cert[6]
    recipient = cert[7]
    ipfs_cid = cert[12]

    if not ipfs_cid:
        raise HTTPException(
            404, "Bằng cấp này tồn tại nhưng không đính kèm file (IPFS CID trống)")

    # 3. Phân quyền kiểm tra vai trò người gọi API
    wallet_lower = req.wallet.lower()
    checksum_wallet = w3_sepolia.to_checksum_address(req.wallet)

    try:
        is_admin_result = registry_contract.functions.isAdmin(
            checksum_wallet).call()
    except Exception:
        is_admin_result = False

    is_issuer_of_cert = (issuer.lower() == wallet_lower)
    is_recipient_of_cert = (recipient.lower() == wallet_lower)

    # Nếu không thỏa mãn bất kì quyền nào -> Từ chối
    if not (is_admin_result or is_issuer_of_cert or is_recipient_of_cert):
        raise HTTPException(
            403, "Tài khoản của bạn không có quyền để xem tập tin đính kèm này")

    # 4. Tải bản mã hoá từ IPFS, giải mã ngay trên server, trả file thật
    #    (KHÔNG trả về link gateway công khai nữa)
    try:
        file_obj = await fetch_and_decrypt_from_ipfs(ipfs_cid)
    except Exception:
        raise HTTPException(
            500, "Không thể giải mã file. File có thể bị hỏng hoặc sai khoá mã hoá.")

    # Mã hoá tên file theo chuẩn RFC 5987 để header chấp nhận ký tự Unicode (tiếng Việt có dấu)
    safe_filename = quote(file_obj["filename"])

    return StreamingResponse(
        io.BytesIO(file_obj["data"]),
        media_type=file_obj["contentType"],
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{safe_filename}"
        },
    )

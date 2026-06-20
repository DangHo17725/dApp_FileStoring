# backend_api/ipfs_service.py
import os
import json
import base64
import httpx
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

load_dotenv()
PINATA_JWT = os.getenv("PINATA_JWT")

_key_b64 = os.getenv("FILE_ENCRYPTION_KEY")
if not _key_b64:
    raise RuntimeError("FILE_ENCRYPTION_KEY chưa được set trong .env")
ENCRYPTION_KEY = base64.b64decode(_key_b64)
if len(ENCRYPTION_KEY) != 32:
    raise RuntimeError(
        "FILE_ENCRYPTION_KEY phải là 32 bytes (base64 của AES-256 key)")


def _encrypt_payload(file_bytes: bytes, filename: str, content_type: str) -> bytes:
    """
    Đóng gói filename + contentType + data gốc vào JSON, sau đó mã hoá
    bằng AES-256-GCM. Kết quả: nonce (12 bytes) + ciphertext.
    """
    aesgcm = AESGCM(ENCRYPTION_KEY)
    nonce = os.urandom(12)
    payload = json.dumps({
        "filename": filename,
        "contentType": content_type or "application/octet-stream",
        "data": base64.b64encode(file_bytes).decode(),
    }).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, payload, None)
    return nonce + ciphertext


def _decrypt_payload(blob: bytes) -> dict:
    aesgcm = AESGCM(ENCRYPTION_KEY)
    nonce, ciphertext = blob[:12], blob[12:]
    payload = aesgcm.decrypt(nonce, ciphertext, None)
    obj = json.loads(payload)
    obj["data"] = base64.b64decode(obj["data"])
    return obj


async def pin_file_to_ipfs(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
    """
    Mã hoá file rồi upload lên Pinata. CID trả về trỏ tới dữ liệu ĐÃ MÃ HOÁ,
    nên dù public gateway có lộ CID, ai tải về cũng chỉ thấy byte vô nghĩa.
    """
    if not PINATA_JWT:
        raise RuntimeError("PINATA_JWT chưa được set trong .env")

    encrypted_blob = _encrypt_payload(file_bytes, filename, content_type)

    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {"Authorization": f"Bearer {PINATA_JWT}"}
    files = {"file": (f"{filename}.enc", encrypted_blob,
                      "application/octet-stream")}

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, files=files, timeout=30)
        resp.raise_for_status()

    return resp.json()["IpfsHash"]


async def fetch_and_decrypt_from_ipfs(cid: str) -> dict:
    """
    Server-side: tải blob đã mã hoá từ IPFS gateway, giải mã, trả về
    dict {filename, contentType, data}. CHỈ được gọi sau khi đã xác minh quyền.
    """
    gateway_url = f"https://gateway.pinata.cloud/ipfs/{cid}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(gateway_url, timeout=30)
        resp.raise_for_status()

    return _decrypt_payload(resp.content)

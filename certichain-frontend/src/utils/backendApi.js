const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' ? payload.detail || payload.message : payload;
    throw new Error(message || `Backend request failed: ${response.status}`);
  }
  return payload;
}

export async function checkBackendHealth() {
  return request('/api/health');
}

export async function hashFileWithBackend(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/hash/file', {
    method: 'POST',
    body: formData,
  });
}

export async function buildMerkleBatch(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  return request('/api/merkle/build', {
    method: 'POST',
    body: formData,
  });
}

export async function verifyMerkleProof({ documentHash, merkleRoot, proof }) {
  return request('/api/merkle/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentHash, merkleRoot, proof }),
  });
}

export async function addBatchToBackendChain({ batchId, merkleRoot, documentCount, note }) {
  return request('/api/blockchain/add-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, merkleRoot, documentCount, note }),
  });
}

export async function getBackendChain() {
  return request('/api/blockchain/chain');
}

export async function validateBackendChain() {
  return request('/api/blockchain/validate');
}

export async function tamperBackendBlock(blockIndex = 1) {
  return request('/api/blockchain/tamper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockIndex, newMerkleRoot: '0xtampered_root' }),
  });
}

export async function resetBackendChain() {
  return request('/api/blockchain/reset', { method: 'POST' });
}

export async function uploadFileToIPFS(file) {
  const formData = new FormData();
  formData.append('file', file); // Khớp chính xác tham số 'file' của FastAPI
  
  return request('/api/ipfs/pin', {
    method: 'POST',
    body: formData, // Trình duyệt tự nhận diện FormData để cấu hình Boundary
  });
}

export async function getFileAccess({ certId, wallet, signature, message }) {
  const response = await fetch(`${BACKEND_URL}/api/ipfs/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certId, wallet, signature, message }),
  });

  if (!response.ok) {
    let msg = `Backend request failed: ${response.status}`;
    try {
      const errPayload = await response.json();
      msg = errPayload.detail || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
const filename = match ? decodeURIComponent(match[1]) : certId;

  return { objectUrl: URL.createObjectURL(blob), filename };
}
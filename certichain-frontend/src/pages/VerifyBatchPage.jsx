import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNotary } from '../hooks/useNotary';
import { Layout } from '../components/layout/Layout';
import { PermissionDenied } from '../components/common/States';
import {
  ShieldCheck, FileStack, Hash, FileCheck, Loader2, CheckCircle, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MODES = [
  { id: 'files', label: 'Entire batch',   icon: FileStack },
  { id: 'root',  label: 'Root verification',      icon: Hash },
  { id: 'file',  label: 'single file + proof', icon: FileCheck },
];

export function VerifyBatchPage() {
  const { account } = useWeb3();
  const { checkBatchByFiles, checkBatchByRoot, hashFile, verifyFileWithProof } = useNotary();

  const [mode, setMode] = useState('files');

  // mode: files
  const [files, setFiles] = useState([]);
  // mode: root
  const [rootInput, setRootInput] = useState('');
  // mode: file
  const [singleFile, setSingleFile] = useState(null);
  const [proofJson, setProofJson] = useState(null);
  const [proofName, setProofName] = useState('');

  const [busy, setBusy] = useState(false);
  const [batchResult, setBatchResult] = useState(null); // {notarized, ...}
  const [fileResult, setFileResult] = useState(null);    // {proofValid, batchOnChain}

  const reset = () => { setBatchResult(null); setFileResult(null); };

  const switchMode = (id) => { setMode(id); reset(); };

  const handleVerifyFiles = async () => {
    if (files.length === 0) { toast.error('Please select the exact batch files.'); return; }
    setBusy(true); reset();
    setBatchResult((await checkBatchByFiles(files)) || { notarized: false });
    setBusy(false);
  };

  const handleVerifyRoot = async () => {
    const root = rootInput.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(root)) {
      toast.error('Merkle Root must be a 0x prefix followed by 64 hex characters.');
      return;
    }
    setBusy(true); reset();
    setBatchResult((await checkBatchByRoot(root)) || { notarized: false });
    setBusy(false);
  };

  const loadProofJson = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (!json.merkleRoot || !Array.isArray(json.files)) {
        throw new Error('format');
      }
      setProofJson(json);
      setProofName(f.name);
    } catch {
      toast.error('Invalid JSON format for Batch Proof.');
      setProofJson(null);
      setProofName('');
    }
  };

  const handleVerifyFile = async () => {
    if (!singleFile) { toast.error('Please select a file to verify.'); return; }
    if (!proofJson)  { toast.error('Please upload the Batch Proof JSON file.'); return; }
    setBusy(true); reset();
    try {
      const leafHash = await hashFile(singleFile); // băm file qua backend
      const entry = proofJson.files.find(
        (x) => x.documentHash?.toLowerCase() === leafHash.toLowerCase()
      );
      if (!entry) {
        // hash không khớp file nào trong JSON → file đã sửa hoặc không thuộc lô
        setFileResult({ proofValid: false, batchOnChain: false, notInBatch: true });
        return;
      }
      const res = await verifyFileWithProof({
        leafHash,
        proof: entry.proof,
        merkleRoot: proofJson.merkleRoot,
      });
      setFileResult(res || { proofValid: false, batchOnChain: false });
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <Layout>
        <PermissionDenied message="Connect wallet to verify a notarized batch." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Verify Batch</h1>
        <p className="text-dark-400">
          Verify a notarized batch — using the entire batch, a Merkle root, or a single file with a Batch Proof JSON.
        </p>
      </div>

      {/* Chọn kiểu xác minh */}
      <div className="flex flex-wrap gap-2 mb-6">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                active
                  ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                  : 'border-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {m.label}
            </button>
          );
        })}
      </div>

      <div className="glass-card p-6 space-y-4 max-w-2xl">
        {mode === 'files' && (
          <>
            <p className="text-sm text-dark-300">
              Upload lại <span className="text-dark-100 font-medium">toàn bộ</span> file của batch (đúng file, đúng thứ tự) để dựng lại root và đối chiếu trên chain.
            </p>
            <input
              type="file"
              multiple
              onChange={(e) => { setFiles(Array.from(e.target.files || [])); reset(); }}
              className="block w-full text-sm text-dark-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
            />
            {files.length > 0 && <p className="text-sm text-dark-400">{files.length} file đã chọn</p>}
            <VerifyButton onClick={handleVerifyFiles} busy={busy} label="Verify entire batch" />
          </>
        )}

        {mode === 'root' && (
          <>
            <p className="text-sm text-dark-300">
              Nhập trực tiếp Merkle root (0x…) để kiểm tra nó đã được công chứng trên chain chưa.
            </p>
            <input
              value={rootInput}
              onChange={(e) => { setRootInput(e.target.value); reset(); }}
              placeholder="0x…"
              className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-100 font-mono text-sm placeholder-dark-500"
            />
            <VerifyButton onClick={handleVerifyRoot} busy={busy} label="Verify Merkle Root" />
          </>
        )}

        {mode === 'file' && (
          <>
            <p className="text-sm text-dark-300">
              Chọn 1 file rồi nạp Batch Proof JSON đã tải lúc công chứng. Hệ thống băm file, lấy proof tương ứng trong JSON, rồi verify trên chain.
            </p>
            <div>
              <label className="block text-xs text-dark-400 mb-1">File cần kiểm tra</label>
              <input
                type="file"
                onChange={(e) => { setSingleFile(e.target.files?.[0] || null); reset(); }}
                className="block w-full text-sm text-dark-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Batch Proof JSON</label>
              <input
                type="file"
                accept="application/json,.json"
                onChange={loadProofJson}
                className="block w-full text-sm text-dark-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-700 file:text-dark-200 file:cursor-pointer"
              />
              {proofName && (
                <p className="text-xs text-dark-500 mt-1">
                  Đã nạp: {proofName} · {proofJson?.files?.length} file · root {proofJson?.merkleRoot?.slice(0, 10)}…
                </p>
              )}
            </div>
            <VerifyButton onClick={handleVerifyFile} busy={busy} label="Verify file" />
          </>
        )}

        {/* ── Kết quả batch (files / root) ── */}
        {batchResult && (
          batchResult.notarized ? (
            <Result ok title="Batch đã được công chứng">
              <Line label="Thời điểm" value={new Date(batchResult.timestamp * 1000).toLocaleString()} />
              <Line label="Người gửi" value={batchResult.submitter} mono />
              <Line label="Số file" value={String(batchResult.fileCount)} />
              {batchResult.description && <Line label="Mô tả" value={batchResult.description} />}
            </Result>
          ) : (
            <Result title="Chưa được công chứng">
              <p className="text-dark-400 text-sm">
                Root này không có trên chain — có thể lô chưa công chứng, hoặc bộ file/thứ tự khác lúc gốc nên ra root khác.
              </p>
            </Result>
          )
        )}

        {/* ── Kết quả 1 file ── */}
        {fileResult && (
          fileResult.notInBatch ? (
            <Result title="File Not Found in Batch">
              <p className="text-dark-400 text-sm">
                The file hash does not match any entry in the Batch Proof JSON. The file may have been modified or belongs to a different batch.
              </p>
            </Result>
          ) : (
            <Result
              ok={fileResult.proofValid && fileResult.batchOnChain}
              title={fileResult.proofValid && fileResult.batchOnChain
                ? 'File Valid & Belongs to On-Chain Batch'
                : 'Invalid File'}
            >
              <Line label="Valid proof (File integrity verified)" value={fileResult.proofValid ? 'Yes' : 'No'} />
              <Line label="Batch On-Chain" value={fileResult.batchOnChain ? 'YES' : 'NO'} />
            </Result>
          )
        )}
      </div>
    </Layout>
  );
}

function VerifyButton({ onClick, busy, label }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {label}
    </button>
  );
}

function Result({ ok, title, children }) {
  const Icon = ok ? CheckCircle : XCircle;
  const color = ok ? 'text-green-400' : 'text-yellow-400';
  return (
    <div className="mt-2 p-4 rounded-lg border border-dark-700 bg-dark-800/50 space-y-2">
      <div className={`flex items-center gap-2 font-medium ${color}`}>
        <Icon className="w-5 h-5" /> {title}
      </div>
      {children}
    </div>
  );
}

function Line({ label, value, mono }) {
  return (
    <p className="text-sm">
      <span className="text-dark-500">{label}: </span>
      <span className={`text-dark-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </p>
  );
}
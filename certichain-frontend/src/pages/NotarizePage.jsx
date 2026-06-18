import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNotary } from '../hooks/useNotary';
import { Layout } from '../components/layout/Layout';
import { PermissionDenied } from '../components/common/States';
import {
  ShieldCheck, FileText, CheckCircle, XCircle, Loader2, ExternalLink, FileStack,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function NotarizePage() {
  const { account } = useWeb3();
  const { notarizeBatch, verifyDocument, isLoading } = useNotary();

  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [verifyState, setVerifyState] = useState({}); // fileName -> 'loading' | {proofValid, batchOnChain}

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []));
    setResult(null);
    setVerifyState({});
  };

  const handleNotarize = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    const res = await notarizeBatch(files, description);
    if (res?.success) setResult(res);
  };

  const handleVerifyFile = async (file) => {
    setVerifyState((s) => ({ ...s, [file.fileName]: 'loading' }));
    const res = await verifyDocument({
      leafHash:   file.documentHash,
      proof:      file.proof,
      merkleRoot: result.merkleRoot,
    });
    setVerifyState((s) => ({ ...s, [file.fileName]: res || { proofValid: false, batchOnChain: false } }));
  };

  if (!account) {
    return (
      <Layout>
        <PermissionDenied message="Connect your wallet to notarize a document batch." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Batch Notarization</h1>
        <p className="text-dark-400">
          Gộp nhiều file thành một Merkle root và công chứng root đó lên chain (DocumentNotary)
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ─── Notarize ─── */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileStack className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold text-dark-100">1. Chọn file</h2>
          </div>

          <input
            type="file"
            multiple
            onChange={handleFiles}
            className="block w-full text-sm text-dark-300
                       file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:bg-primary-500/20 file:text-primary-300 file:cursor-pointer"
          />
          {files.length > 0 && (
            <p className="text-sm text-dark-400">{files.length} file đã chọn</p>
          )}

          <div>
            <label className="label">Mô tả (tuỳ chọn)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Lô tốt nghiệp 2026 - CNTT"
              className="input-field"
            />
          </div>

          <button
            onClick={handleNotarize}
            disabled={isLoading || files.length === 0}
            className="btn-primary w-full justify-center"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><ShieldCheck className="w-5 h-5" /> Notarize on Blockchain</>
            )}
          </button>
        </div>

        {/* ─── Result + verify ─── */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold text-dark-100">2. Kết quả & verify on-chain</h2>
          </div>

          {!result ? (
            <p className="text-dark-500 text-sm">
              Công chứng một lô để thấy Merkle root và verify từng file ngay trên chain.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-dark-500">Merkle Root</p>
                <p className="font-mono text-xs text-primary-400 break-all">{result.merkleRoot}</p>
              </div>

              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-dark-500">Số file</p>
                  <p className="text-dark-200">{result.fileCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Block</p>
                  <p className="text-dark-200">{result.blockNumber}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-dark-500">Tx Hash</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                  target="_blank" rel="noreferrer"
                  className="font-mono text-xs text-primary-400 break-all inline-flex items-center gap-1"
                >
                  {result.txHash} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="border-t border-dark-700 pt-3 space-y-2">
                <p className="text-xs text-dark-500">Proof từng file — bấm để verify trên chain</p>
                {result.files.map((f) => {
                  const v = verifyState[f.fileName];
                  return (
                    <div key={f.fileName} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm text-dark-200 truncate">
                        <FileText className="w-4 h-4 text-dark-500 shrink-0" />
                        <span className="truncate">{f.fileName}</span>
                      </span>

                      {v === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-400 shrink-0" />
                      ) : v ? (
                        v.proofValid && v.batchOnChain ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-sm shrink-0">
                            <CheckCircle className="w-4 h-4" /> Valid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm shrink-0">
                            <XCircle className="w-4 h-4" /> Invalid
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => handleVerifyFile(f)}
                          className="btn-secondary px-3 py-1 text-xs shrink-0"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
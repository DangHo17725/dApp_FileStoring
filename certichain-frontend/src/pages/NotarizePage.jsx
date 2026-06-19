import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNotary } from '../hooks/useNotary';
import { Layout } from '../components/layout/Layout';
import { PermissionDenied } from '../components/common/States';
import { FileText, ShieldCheck, Download, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotaryLogs, downloadJson } from '../utils/notaryStorage';

export function NotarizePage() {
  const { account } = useWeb3();
  const { notarizeBatch, isLoading } = useNotary();

  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState(() => getNotaryLogs());

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []));
    setResult(null);
  };

  const handleNotarize = async () => {
    if (files.length === 0) {
      toast.error('Chọn ít nhất một file');
      return;
    }

    try {
      const res = await notarizeBatch(files, description);

      if (res?.merkleRoot) {
        setResult(res);
        setLogs(getNotaryLogs());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownloadProof = (batch) => {
    if (!batch?.merkleRoot) return;

    const proofFile = {
      batchId: batch.batchId,
      type: 'DOCUMENT_NOTARY_BATCH_PROOF',
      merkleRoot: batch.merkleRoot,
      txHash: batch.txHash || null,
      blockNumber: batch.blockNumber || null,
      fileCount: batch.fileCount,
      description: batch.description || '',
      status: batch.status,
      submitter: batch.submitter || account,
      createdAt: batch.createdAt || new Date().toISOString(),
      files: batch.files || [],
    };

    downloadJson(
      proofFile,
      `batch-proof-${batch.merkleRoot.slice(2, 10)}.json`
    );
  };

  if (!account) {
    return (
      <Layout>
        <PermissionDenied message="Kết nối ví để công chứng một lô tài liệu." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Document Notary</h1>
        <p className="text-dark-400">
          Công chứng một lô file mới: hệ thống hash từng file, tạo Merkle Tree,
          ghi Merkle Root lên blockchain và xuất Batch Proof JSON để xác minh sau.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold text-dark-100">
              1. Chọn file & công chứng
            </h2>
          </div>

          <input
            type="file"
            multiple
            onChange={handleFiles}
            className="block w-full text-sm text-dark-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
          />

          {files.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-dark-400">
                {files.length} file đã chọn
              </p>

              <div className="max-h-32 overflow-y-auto rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                {files.map((file, index) => (
                  <p
                    key={`${file.name}-${index}`}
                    className="text-xs text-dark-400 truncate"
                  >
                    {index + 1}. {file.name}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1">
              Mô tả batch
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Hồ sơ sinh viên Nguyễn Văn A"
              className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500"
            />
          </div>

          <button
            onClick={handleNotarize}
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Notarize on Blockchain
          </button>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold text-dark-100">
              2. Kết quả & Batch Proof
            </h2>
          </div>

          {!result ? (
            <p className="text-dark-400 text-sm">
              Sau khi công chứng, hệ thống sẽ hiển thị Merkle Root, transaction
              hash, block number và cho phép tải Batch Proof JSON.
            </p>
          ) : (
            <div className="space-y-3">
              <StatusBadge status={result.status} />

              <Field label="Merkle Root" value={result.merkleRoot} mono />
              <Field label="Tx Hash" value={result.txHash || '-'} mono />
              <Field
                label="Block"
                value={result.blockNumber ? String(result.blockNumber) : '-'}
              />
              <Field label="Số file" value={String(result.fileCount)} />

              {result.description && (
                <Field label="Mô tả" value={result.description} />
              )}

              {result.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-400 text-sm hover:underline flex items-center gap-1"
                >
                  Xem transaction trên Sepolia Etherscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                onClick={() => handleDownloadProof(result)}
                className="w-full py-2 rounded-lg border border-primary-500 text-primary-400 hover:bg-primary-600/10 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải Batch Proof JSON
              </button>

              <p className="text-xs text-dark-500">
                Giữ file JSON này cùng các file gốc. File JSON chứa Merkle Proof
                để verify từng file riêng lẻ ở trang Verify Batch.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary-400" />
          <h2 className="font-semibold text-dark-100">
            3. Notary Logs
          </h2>
        </div>

        {logs.length === 0 ? (
          <p className="text-dark-400 text-sm">
            Chưa có batch nào được lưu log trên trình duyệt này.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.merkleRoot}
                className="p-4 rounded-xl bg-dark-900/60 border border-dark-700"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <StatusBadge status={log.status} />

                    <Field label="Merkle Root" value={log.merkleRoot} mono />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Field label="Số file" value={String(log.fileCount)} />
                      <Field
                        label="Block"
                        value={log.blockNumber ? String(log.blockNumber) : '-'}
                      />
                      <Field
                        label="Ngày tạo"
                        value={
                          log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : '-'
                        }
                      />
                      <Field label="Trạng thái" value={log.status || '-'} />
                    </div>

                    {log.description && (
                      <Field label="Mô tả" value={log.description} />
                    )}

                    {log.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-400 text-sm hover:underline flex items-center gap-1"
                      >
                        Xem transaction
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleDownloadProof(log)}
                    className="px-4 py-2 rounded-lg border border-primary-500 text-primary-400 hover:bg-primary-600/10 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-dark-500 text-xs mb-0.5">{label}</p>
      <p
        className={`text-dark-200 text-sm break-all ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value || '-'}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = status || 'unknown';

  const className =
    normalized === 'success' || normalized === 'notarized'
      ? 'bg-green-500/10 text-green-400'
      : normalized === 'already_exists'
      ? 'bg-yellow-500/10 text-yellow-400'
      : normalized === 'failed'
      ? 'bg-red-500/10 text-red-400'
      : 'bg-blue-500/10 text-blue-400';

  const label =
    normalized === 'already_exists'
      ? 'Already Notarized'
      : normalized === 'notarized'
      ? 'Notarized'
      : normalized;

  return (
    <span
      className={`inline-flex w-fit px-2 py-1 rounded-lg text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
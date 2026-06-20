import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useCertificates } from '../hooks/useCertificates';
import { Layout } from '../components/layout/Layout';
import {
  RefreshCw, ShieldCheck, Loader2, Copy, AlertTriangle, CheckCircle, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Sinh certId mới cùng định dạng hệ thống: CERT-<base36 timestamp>-<4 ký tự ngẫu nhiên>
function genCertId() {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

// Date -> chuỗi cho input datetime-local (YYYY-MM-DDTHH:mm)
function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReissuePage() {
  const navigate = useNavigate();
  const { account, isAdmin } = useWeb3();
  const { getCertificate, issueCertificate, revokeCertificate, loadAllCertificates, isLoading } = useCertificates();

  const [oldCertId, setOldCertId] = useState('');
  const [newExpiry, setNewExpiry] = useState('');   // datetime-local
  const [revokeOld, setRevokeOld] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const setRelative = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setNewExpiry(toLocalInput(d));
    setResult(null);
  };

  const handleReissue = async () => {
    const id = oldCertId.trim();
    if (!id) { toast.error('Nhập Certificate ID cũ'); return; }
    if (!newExpiry) { toast.error('Chọn thời gian hết hạn mới'); return; }

    const newExpiresAtSec = Math.floor(new Date(newExpiry).getTime() / 1000);
    if (newExpiresAtSec <= Math.floor(Date.now() / 1000)) {
      toast.error('Hạn mới phải ở tương lai');
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      // 1) Lấy cert cũ (đầy đủ field, gồm merkleRoot)
      const old = await getCertificate(id);
      if (!old) { toast.error('Không tìm thấy chứng chỉ với ID này'); setBusy(false); return; }

      // 2) Phát cert MỚI: cùng dữ liệu, certId mới + hạn mới
      const newCertId = genCertId();
      const res = await issueCertificate({
        certId:       newCertId,
        certName:     old.certName,
        certType:     old.certType,
        documentHash: old.documentHash,   // cùng tài liệu → cùng hash
        metadataHash: old.metadataHash,
        merkleRoot:   old.merkleRoot,
        recipient:    old.recipient,
        expiresAt:    newExpiresAtSec,     // hạn mới
      });
      if (!res?.success) { setBusy(false); return; } // hook đã hiện toast lỗi

      // Hiện kết quả ngay (cert mới đã tạo xong)
      setResult({ oldCertId: id, newCertId, txHash: res.txHash, expiresAt: newExpiresAtSec, revoked: false });

      // 3) (tuỳ chọn) revoke cert cũ, ghi rõ đã gia hạn → cert mới
      if (revokeOld) {
        const ok = await revokeCertificate(id, `Gia hạn → ${newCertId}`);
        setResult((r) => ({ ...r, revoked: ok }));
      }

      await loadAllCertificates();
    } catch (error) {
      console.error('Reissue error:', error);
      toast.error(error.reason || error.message || 'Gia hạn thất bại');
    } finally {
      setBusy(false);
    }
  };

  // ── Chặn truy cập ──
  if (!account) {
    return (
      <Layout>
        <div className="glass-card p-6 text-dark-300">Kết nối ví để tiếp tục.</div>
      </Layout>
    );
  }
  if (!isAdmin) {
    return (
      <Layout>
        <div className="glass-card p-6 border-l-4 border-l-amber-500 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <div>
            <h3 className="font-semibold text-dark-100">Chỉ dành cho quản trị viên</h3>
            <p className="text-dark-400">Chỉ tài khoản admin mới được gia hạn (cấp lại) chứng chỉ.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Gia hạn chứng chỉ</h1>
        <p className="text-dark-400">
          Cấp lại một chứng chỉ với hạn mới. Hệ thống tạo một chứng chỉ <span className="text-dark-100">mới</span> (ID mới) cho cùng tài liệu; chứng chỉ cũ vẫn nằm trên blockchain làm bản ghi lịch sử.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Certificate ID cũ</label>
            <input
              value={oldCertId}
              onChange={(e) => { setOldCertId(e.target.value); setResult(null); }}
              placeholder="CERT-XXXXX-XXXX"
              className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-100 font-mono placeholder-dark-500"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1">Hết hạn mới</label>
            <input
              type="datetime-local"
              value={newExpiry}
              onChange={(e) => { setNewExpiry(e.target.value); setResult(null); }}
              className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-100"
            />
            <div className="flex gap-2 mt-2">
              {[['+6 tháng', 6], ['+1 năm', 12], ['+2 năm', 24]].map(([label, m]) => (
                <button
                  key={m}
                  onClick={() => setRelative(m)}
                  className="px-3 py-1 text-xs rounded-lg border border-dark-700 text-dark-400 hover:text-dark-200"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input type="checkbox" checked={revokeOld} onChange={(e) => setRevokeOld(e.target.checked)} />
            Thu hồi chứng chỉ cũ và ghi chú đã gia hạn
          </label>

          <button
            onClick={handleReissue}
            disabled={busy || isLoading}
            className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Gia hạn
          </button>

          {revokeOld && (
            <p className="text-xs text-dark-500">
              Lưu ý: bật tuỳ chọn này sẽ cần ký 2 giao dịch (cấp mới + thu hồi cũ).
            </p>
          )}
        </div>

        {/* ── Kết quả ── */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-dark-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" /> Kết quả
          </h2>

          {!result ? (
            <p className="text-dark-400 text-sm">Nhập ID cũ và chọn hạn mới rồi bấm Gia hạn để tạo chứng chỉ mới.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <CheckCircle className="w-5 h-5" /> Đã gia hạn thành công
              </div>
              <Row label="ID cũ" value={result.oldCertId} mono />
              <RowCopy label="ID mới" value={result.newCertId} />
              <Row label="Hết hạn mới" value={new Date(result.expiresAt * 1000).toLocaleString()} />
              <Row label="Tx Hash" value={result.txHash} mono />
              {revokeOld && (
                <p className="text-xs text-dark-500">
                  {result.revoked ? 'Đã thu hồi chứng chỉ cũ.' : 'Chưa thu hồi được chứng chỉ cũ (giao dịch revoke bị huỷ/lỗi).'}
                </p>
              )}
              <button
                onClick={() => navigate(`/certificate/${result.newCertId}`)}
                className="w-full mt-1 py-2 rounded-lg border border-primary-500 text-primary-400 hover:bg-primary-600/10 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Xem chứng chỉ mới
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Row({ label, value, mono }) {
  return (
    <div>
      <p className="text-dark-500 text-xs mb-0.5">{label}</p>
      <p className={`text-dark-200 text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function RowCopy({ label, value }) {
  return (
    <div>
      <p className="text-dark-500 text-xs mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-primary-400 font-mono text-sm break-all">{value}</p>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success('Đã copy ID mới'); }}>
          <Copy className="w-4 h-4 text-dark-400 hover:text-dark-200" />
        </button>
      </div>
    </div>
  );
}
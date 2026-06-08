import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useCertificates } from '../hooks/useCertificates';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner, EmptyState } from '../components/common/States';
import { StatusBadge, TypeBadge } from '../components/common/Badges';
import { AddressDisplay, HashDisplay, TimestampDisplay } from '../components/common/Displays';
import { formatDate, formatAddress } from '../utils/format';
import toast from 'react-hot-toast';
import {
  Award,
  ArrowLeft,
  Copy,
  ExternalLink,
  QrCode,
  Shield,
  ShieldOff,
  Calendar,
  User,
  Building2,
  FileText,
  Hash,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

export function CertificateDetailPage() {
  const { certId } = useParams();
  const navigate = useNavigate();
  const { account, isAdmin, isIssuer, networkInfo } = useWeb3();
  const { getCertificate, revokeCertificate, isLoading } = useCertificates();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      setLoading(true);
      try {
        const cert = await getCertificate(certId);
        setCertificate(cert);
      } catch (error) {
        console.error('Error fetching certificate:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [certId, getCertificate]);

  const canRevoke = certificate && 
    certificate.statusLabel === 'Valid' && 
    (isAdmin || (isIssuer && certificate.issuer.toLowerCase() === account?.toLowerCase()));

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }

    setRevoking(true);
    try {
      const result = await revokeCertificate(certId, revokeReason);
      if (result?.success) {
        setCertificate(prev => ({
          ...prev,
          status: 1,
          statusLabel: 'Revoked',
          revokedReason: revokeReason,
          revokedAt: Math.floor(Date.now() / 1000),
        }));
        setShowRevokeModal(false);
        setRevokeReason('');
      }
    } catch (error) {
      console.error('Revoke error:', error);
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!certificate) {
    return (
      <Layout>
        <EmptyState
          icon={FileText}
          title="Certificate Not Found"
          message={`No certificate found with ID: ${certId}`}
          action={
            <button onClick={() => navigate('/certificates')} className="btn-primary">
              <ArrowLeft className="w-5 h-5" />
              Back to Certificates
            </button>
          }
        />
      </Layout>
    );
  }

  const statusIcon = {
    Valid: <CheckCircle className="w-6 h-6 text-emerald-400" />,
    Revoked: <XCircle className="w-6 h-6 text-red-400" />,
    Expired: <AlertTriangle className="w-6 h-6 text-amber-400" />,
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{certificate.certName}</h1>
            <p className="text-dark-400 font-mono">{certificate.certId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/verify?id=${certId}`} className="btn-secondary">
            <QrCode className="w-5 h-5" />
            QR Code
          </Link>
          {canRevoke && (
            <button onClick={() => setShowRevokeModal(true)} className="btn-danger">
              <ShieldOff className="w-5 h-5" />
              Revoke
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className={`glass-card p-6 border-l-4 ${
            certificate.statusLabel === 'Valid' ? 'border-l-emerald-500' :
            certificate.statusLabel === 'Revoked' ? 'border-l-red-500' : 'border-l-amber-500'
          }`}>
            <div className="flex items-center gap-4">
              {statusIcon[certificate.statusLabel]}
              <div className="flex-1">
                <h3 className="font-semibold text-dark-100">Certificate Status</h3>
                <p className="text-dark-400">
                  {certificate.statusLabel === 'Valid' && 'This certificate is valid and verified on the blockchain'}
                  {certificate.statusLabel === 'Revoked' && `Revoked: ${certificate.revokedReason || 'No reason provided'}`}
                  {certificate.statusLabel === 'Expired' && `Expired on ${formatDate(certificate.expiresAt)}`}
                </p>
              </div>
              <StatusBadge status={certificate.statusLabel} />
            </div>
          </div>

          {/* Certificate Details */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Certificate Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-dark-500 mb-1">Certificate Name</p>
                <p className="text-dark-200">{certificate.certName}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Certificate Type</p>
                <TypeBadge type={certificate.certType} />
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Certificate ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-primary-400">{certificate.certId}</p>
                  <button
                    onClick={() => copyToClipboard(certificate.certId, 'Certificate ID')}
                    className="text-dark-500 hover:text-primary-400"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Issued At</p>
                <p className="text-dark-200">{formatDate(certificate.issuedAt, true)}</p>
              </div>
              {certificate.expiresAt > 0 && (
                <div>
                  <p className="text-xs text-dark-500 mb-1">Expires At</p>
                  <p className="text-dark-200">{formatDate(certificate.expiresAt, true)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-400" />
              Parties
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-dark-500 mb-1">Issuer</p>
                <AddressDisplay address={certificate.issuer} networkInfo={networkInfo} showFull />
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Recipient</p>
                <AddressDisplay address={certificate.recipient} networkInfo={networkInfo} showFull />
              </div>
            </div>
          </div>

          {/* Hashes */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary-400" />
              Cryptographic Hashes
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-dark-500 mb-1">Document Hash (SHA-256)</p>
                <HashDisplay hash={certificate.documentHash} />
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Metadata Hash</p>
                <HashDisplay hash={certificate.metadataHash} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Certificate Visual */}
          <div className="glass-card p-6 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center">
              <Award className="w-12 h-12 text-primary-400" />
            </div>
            <h3 className="font-semibold text-dark-100 mb-1">{certificate.certName}</h3>
            <TypeBadge type={certificate.certType} />
            <div className="mt-4 pt-4 border-t border-dark-700">
              <p className="text-xs text-dark-500">Issued to</p>
              <p className="font-mono text-sm text-primary-400">{formatAddress(certificate.recipient)}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-400" />
              Timeline
            </h2>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-dark-700" />
              
              <div className="relative">
                <div className="absolute -left-4 w-3 h-3 rounded-full bg-emerald-500" />
                <p className="text-xs text-dark-500">Issued</p>
                <p className="text-sm text-dark-300">{formatDate(certificate.issuedAt, true)}</p>
              </div>

              {certificate.expiresAt > 0 && (
                <div className="relative">
                  <div className={`absolute -left-4 w-3 h-3 rounded-full ${
                    certificate.statusLabel === 'Expired' ? 'bg-amber-500' : 'bg-dark-600'
                  }`} />
                  <p className="text-xs text-dark-500">Expiry</p>
                  <p className="text-sm text-dark-300">{formatDate(certificate.expiresAt, true)}</p>
                </div>
              )}

              {certificate.statusLabel === 'Revoked' && certificate.revokedAt && (
                <div className="relative">
                  <div className="absolute -left-4 w-3 h-3 rounded-full bg-red-500" />
                  <p className="text-xs text-dark-500">Revoked</p>
                  <p className="text-sm text-dark-300">{formatDate(certificate.revokedAt, true)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-dark-100 mb-4">Actions</h2>
            <div className="space-y-3">
              <Link to={`/verify?id=${certId}`} className="btn-secondary w-full justify-center">
                <Shield className="w-5 h-5" />
                Verify Certificate
              </Link>
              <button
                onClick={() => copyToClipboard(window.location.href, 'Link')}
                className="btn-ghost w-full justify-center"
              >
                <Copy className="w-5 h-5" />
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Revoke Certificate</h3>
            <p className="text-dark-400 mb-4">
              This action cannot be undone. The certificate will be permanently marked as revoked on the blockchain.
            </p>
            <div className="mb-4">
              <label className="label">Reason for Revocation *</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter the reason for revoking this certificate"
                className="input-field min-h-[100px]"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                }}
                className="btn-ghost flex-1"
                disabled={revoking}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking || !revokeReason.trim()}
                className="btn-danger flex-1"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-5 h-5" />
                    Revoke
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

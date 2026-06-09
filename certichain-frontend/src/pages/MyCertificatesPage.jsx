import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useCertificates } from '../hooks/useCertificates';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner, EmptyState, NotConnected } from '../components/common/States';
import { StatusBadge, TypeBadge } from '../components/common/Badges';
import { formatDate, formatAddress } from '../utils/format';
import {
  Award,
  Eye,
  Download,
  QrCode,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';

export function MyCertificatesPage() {
  const { account, isConnecting, connectWallet } = useWeb3();
  const { certificates, isLoading } = useCertificates();

  const myCertificates = useMemo(() => {
    if (!account) return [];
    return certificates.filter(
      cert => cert.recipient.toLowerCase() === account.toLowerCase()
    );
  }, [certificates, account]);

  if (!account) {
    return (
      <Layout>
        <NotConnected
          message="Connect your wallet to view certificates issued to your address"
          onConnect={connectWallet}
          isConnecting={isConnecting}
        />
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">My Certificates</h1>
        <p className="text-dark-400">Certificates issued to your wallet address</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-sm text-dark-500">Total</p>
          <p className="text-2xl font-bold text-dark-100">{myCertificates.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-dark-500">Valid</p>
          <p className="text-2xl font-bold text-emerald-400">
            {myCertificates.filter(c => c.statusLabel === 'Valid').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-dark-500">Expired</p>
          <p className="text-2xl font-bold text-amber-400">
            {myCertificates.filter(c => c.statusLabel === 'Expired').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-dark-500">Revoked</p>
          <p className="text-2xl font-bold text-red-400">
            {myCertificates.filter(c => c.statusLabel === 'Revoked').length}
          </p>
        </div>
      </div>

      {myCertificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No Certificates Yet"
          message="You haven't received any certificates at this wallet address"
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCertificates.map(cert => (
            <div key={cert.certId} className="glass-card p-6 hover:border-primary-500/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary-400" />
                </div>
                <StatusBadge status={cert.statusLabel} />
              </div>

              <h3 className="font-semibold text-dark-100 mb-1 truncate">{cert.certName}</h3>
              <p className="text-sm font-mono text-primary-400 mb-3">{cert.certId}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <TypeBadge type={cert.certType} />
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Building2 className="w-4 h-4" />
                  <span>By: {formatAddress(cert.issuer)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(cert.issuedAt)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/certificate/${cert.certId}`}
                  className="btn-primary flex-1 justify-center text-sm py-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Link>
                <Link
                  to={`/verify?id=${cert.certId}`}
                  className="btn-secondary px-3 py-2"
                  title="QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

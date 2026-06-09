import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useCertificates } from '../hooks/useCertificates';
import { useContractEvents } from '../hooks/useContractEvents';
import { Layout } from '../components/layout/Layout';
import { StatusBadge, EventTypeBadge } from '../components/common/Badges';
import { AddressDisplay, TxHashDisplay } from '../components/common/Displays';
import { LoadingCard, EmptyState } from '../components/common/States';
import { formatDate, formatRelativeTime, getCertificateStatus } from '../utils/format';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  ArrowRight,
  Zap,
  Info,
} from 'lucide-react';

export function DashboardPage() {
  const { account, contract } = useWeb3();
  const { getAllCertificateIds, getCertificate } = useCertificates();
  const { events, isLoading: eventsLoading } = useContractEvents();

  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    revoked: 0,
    expired: 0,
  });
  const [recentCerts, setRecentCerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!contract) {
        setIsLoading(false);
        return;
      }

      try {
        const allIds = await getAllCertificateIds();
        const certsData = await Promise.all(
          allIds.slice(-20).map(id => getCertificate(id))
        );

        const validCerts = certsData.filter(c => c && getCertificateStatus(c.status, c.expiresAt) === 'Valid');
        const revokedCerts = certsData.filter(c => c && getCertificateStatus(c.status, c.expiresAt) === 'Revoked');
        const expiredCerts = certsData.filter(c => c && getCertificateStatus(c.status, c.expiresAt) === 'Expired');

        setStats({
          total: allIds.length,
          valid: validCerts.length,
          revoked: revokedCerts.length,
          expired: expiredCerts.length,
        });

        setRecentCerts(certsData.filter(Boolean).slice(-5).reverse());
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [contract, getAllCertificateIds, getCertificate]);

  const statCards = [
    { label: 'Total Certificates', value: stats.total, icon: FileText, color: 'text-primary-400' },
    { label: 'Valid', value: stats.valid, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Revoked', value: stats.revoked, icon: XCircle, color: 'text-red-400' },
    { label: 'Expired', value: stats.expired, icon: Clock, color: 'text-amber-400' },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
        <p className="text-dark-400">Overview of certificate activity</p>
      </div>

      {/* Demo Flow Helper */}
      <div className="mb-8 glass-card border-primary-500/30 bg-primary-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary-300 mb-1">Demo Flow Guide</h3>
            <p className="text-sm text-dark-400 mb-3">
              Get started with CertiChain: Connect Wallet → Issue Certificate → View Certificate → Verify by ID/File → Revoke → Verify Revoked Certificate
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/issue" className="text-xs px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded border border-primary-500/30 hover:bg-primary-500/30 transition-colors">
                Issue Certificate
              </Link>
              <Link to="/certificates" className="text-xs px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded border border-primary-500/30 hover:bg-primary-500/30 transition-colors">
                View Certificates
              </Link>
              <Link to="/demo" className="text-xs px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded border border-primary-500/30 hover:bg-primary-500/30 transition-colors">
                Full Demo Flow
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-dark-500 text-sm">{stat.label}</span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`text-3xl font-bold ${stat.color}`}>
                {isLoading ? '-' : stat.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Certificates */}
        <div className="glass-card">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="font-semibold text-dark-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Recent Certificates
            </h2>
            <Link to="/certificates" className="text-sm text-primary-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {isLoading ? (
              <div className="p-4">
                <LoadingCard message="Loading certificates..." />
              </div>
            ) : recentCerts.length === 0 ? (
              <div className="p-8 text-center text-dark-500">
                No certificates issued yet
              </div>
            ) : (
              recentCerts.map((cert) => (
                <Link
                  key={cert.certId}
                  to={`/certificate/${cert.certId}`}
                  className="p-4 flex items-center justify-between hover:bg-dark-800/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-dark-200">{cert.certName}</p>
                    <p className="text-sm text-dark-500">{cert.certId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dark-500 hidden sm:block">
                      {formatDate(cert.issuedAt)}
                    </span>
                    <StatusBadge status={cert.status} expiresAt={cert.expiresAt} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="font-semibold text-dark-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Blockchain Activity
            </h2>
            <Link to="/transactions" className="text-sm text-primary-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {eventsLoading ? (
              <div className="p-4">
                <LoadingCard message="Loading events..." />
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-dark-500">
                No blockchain activity yet
              </div>
            ) : (
              events.slice(0, 5).map((event, idx) => (
                <div key={`${event.transactionHash}-${idx}`} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <EventTypeBadge type={event.type} />
                    <span className="text-xs text-dark-500">
                      {event.timestamp ? formatRelativeTime(event.timestamp) : `Block ${event.blockNumber}`}
                    </span>
                  </div>
                  <div className="text-sm">
                    {event.certId && (
                      <p className="text-dark-300">Certificate: {event.certId}</p>
                    )}
                    {event.account && (
                      <p className="text-dark-400">
                        Account: <span className="font-mono text-primary-400">{event.account.slice(0, 10)}...</span>
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
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
  ArrowRight,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

function getTimeValue(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatActivityTime(activity) {
  const value =
    activity.completedAt ||
    activity.updatedAt ||
    activity.createdAt ||
    activity.timestamp;

  const time = getTimeValue(value);

  if (!time) {
    return activity.blockNumber ? `Block ${activity.blockNumber}` : '-';
  }

  return new Date(time).toLocaleString();
}

export function DashboardPage() {
  const { account, contract, networkInfo } = useWeb3();
  const { getAllCertificateIds, getCertificate } = useCertificates();
  const { events, isLoading: eventsLoading } = useContractEvents();
  const { transactions } = useTransactions();

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
  const recentActivities = useMemo(() => {
  const localTransactions = transactions.map((tx) => ({
    ...tx,
    type: tx.type === 'notarize' ? 'DOCUMENT_NOTARY' : tx.type,
    isLocal: true,
    timestamp:
      tx.completedAt ||
      tx.updatedAt ||
      tx.createdAt ||
      tx.timestamp,
    transactionHash:
      tx.txHash ||
      tx.hash ||
      tx.transactionHash,
  }));

  const contractEvents = events.map((event) => ({
    ...event,
    isLocal: false,
    transactionHash:
      event.transactionHash ||
      event.txHash ||
      event.hash,
  }));

  return [...localTransactions, ...contractEvents]
    .sort((a, b) => {
      const timeA = getTimeValue(
        a.completedAt || a.updatedAt || a.createdAt || a.timestamp
      );
      const timeB = getTimeValue(
        b.completedAt || b.updatedAt || b.createdAt || b.timestamp
      );

      return timeB - timeA;
    })
    .slice(0, 5);
  }, [transactions, events]);

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
            <Link
              to="/transactions"
              className="text-sm text-primary-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-dark-700">
            {eventsLoading && recentActivities.length === 0 ? (
              <div className="p-4">
                <LoadingCard message="Loading events..." />
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="p-8 text-center text-dark-500">
                No blockchain activity yet
              </div>
            ) : (
              recentActivities.map((activity, idx) => {
                const isNotary = activity.type === 'DOCUMENT_NOTARY';
                const txHash =
                  activity.txHash ||
                  activity.hash ||
                  activity.transactionHash;

                return (
                  <div
                    key={activity.id || txHash || `${activity.type}-${idx}`}
                    className="p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isNotary
                            ? 'bg-primary-500/10'
                            : 'bg-dark-800'
                        }`}
                      >
                        {isNotary ? (
                          <ShieldCheck className="w-5 h-5 text-primary-400" />
                        ) : (
                          <Activity className="w-5 h-5 text-dark-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          {isNotary ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary-400">
                                {activity.title || 'Document Notary'}
                              </span>

                              {activity.status && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    activity.status === 'success' ||
                                    activity.status === 'confirmed'
                                      ? 'bg-green-500/10 text-green-400'
                                      : activity.status === 'failed'
                                      ? 'bg-red-500/10 text-red-400'
                                      : activity.status === 'already_exists'
                                      ? 'bg-yellow-500/10 text-yellow-400'
                                      : 'bg-blue-500/10 text-blue-400'
                                  }`}
                                >
                                  {activity.status}
                                </span>
                              )}
                            </div>
                          ) : (
                            <EventTypeBadge type={activity.type} />
                          )}

                          <span className="text-xs text-dark-500 whitespace-nowrap">
                            {formatActivityTime(activity)}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          {isNotary ? (
                            <>
                              {activity.description && (
                                <p className="text-dark-300">
                                  {activity.description}
                                </p>
                              )}

                              {activity.merkleRoot && (
                                <p className="text-dark-400 break-all">
                                  Merkle Root:{' '}
                                  <span className="font-mono text-primary-400">
                                    {activity.merkleRoot}
                                  </span>
                                </p>
                              )}

                              {activity.fileCount !== undefined && (
                                <p className="text-dark-400">
                                  File count:{' '}
                                  <span className="text-dark-300">
                                    {activity.fileCount}
                                  </span>
                                </p>
                              )}

                              {txHash && networkInfo?.blockExplorer && (
                                <a
                                  href={`${networkInfo.blockExplorer}/tx/${txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary-400 hover:underline mt-1"
                                >
                                  View transaction
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </>
                          ) : (
                            <>
                              {activity.certId && (
                                <p className="text-dark-300">
                                  Certificate: {activity.certId}
                                </p>
                              )}

                              {activity.account && (
                                <p className="text-dark-400">
                                  Account:{' '}
                                  <span className="font-mono text-primary-400">
                                    {activity.account.slice(0, 10)}...
                                  </span>
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

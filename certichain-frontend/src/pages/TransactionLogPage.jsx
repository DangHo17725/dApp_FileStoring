import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import { useContractEvents } from '../hooks/useContractEvents';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner, EmptyState, NotConnected } from '../components/common/States';
import { AddressDisplay } from '../components/common/Displays';
import { formatDate, formatAddress, formatTimeAgo } from '../utils/format';
import {
  Activity,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  FileText,
  ExternalLink,
  Filter,
  ChevronDown,
  Award,
  Shield,
  ShieldOff,
  Clock,
  Hash,
} from 'lucide-react';

const EVENT_TYPES = {
  CertificateIssued: {
    icon: Award,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Certificate Issued',
  },
  CertificateRevoked: {
    icon: ShieldOff,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Certificate Revoked',
  },
  IssuerAdded: {
    icon: UserPlus,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Issuer Added',
  },
  IssuerRemoved: {
    icon: UserMinus,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Issuer Removed',
  },
};

export function TransactionLogPage() {
  const { account, networkInfo, isConnecting, connectWallet } = useWeb3();
  const { transactions } = useTransactions();
  const { events, isLoading } = useContractEvents();

  const [filter, setFilter] = useState('all');
  const [showMyOnly, setShowMyOnly] = useState(false);

  const allEvents = useMemo(() => {
    // Combine contract events with local transaction history
    const combined = [...events];
    
    // Add pending transactions
    transactions.forEach(tx => {
      if (tx.status === 'pending') {
        combined.push({
          type: tx.type,
          timestamp: tx.timestamp,
          txHash: tx.hash,
          isPending: true,
          ...tx.data,
        });
      }
    });

    // Sort by timestamp descending
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [events, transactions]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      if (filter !== 'all' && event.type !== filter) return false;
      if (showMyOnly && account) {
        const isMyEvent = 
          event.issuer?.toLowerCase() === account.toLowerCase() ||
          event.recipient?.toLowerCase() === account.toLowerCase() ||
          event.admin?.toLowerCase() === account.toLowerCase();
        if (!isMyEvent) return false;
      }
      return true;
    });
  }, [allEvents, filter, showMyOnly, account]);

  const renderEventDetails = (event) => {
    switch (event.type) {
      case 'CertificateIssued':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Certificate:</span>
              <Link
                to={`/certificate/${event.certId}`}
                className="font-mono text-primary-400 hover:text-primary-300"
              >
                {event.certId}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Issuer:</span>
              <span className="font-mono text-dark-300">{formatAddress(event.issuer)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Recipient:</span>
              <span className="font-mono text-dark-300">{formatAddress(event.recipient)}</span>
            </div>
          </div>
        );
      case 'CertificateRevoked':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Certificate:</span>
              <Link
                to={`/certificate/${event.certId}`}
                className="font-mono text-primary-400 hover:text-primary-300"
              >
                {event.certId}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Revoked By:</span>
              <span className="font-mono text-dark-300">{formatAddress(event.revokedBy)}</span>
            </div>
            {event.reason && (
              <div className="flex items-center gap-2">
                <span className="text-dark-500">Reason:</span>
                <span className="text-dark-300">{event.reason}</span>
              </div>
            )}
          </div>
        );
      case 'IssuerAdded':
      case 'IssuerRemoved':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-dark-500">Issuer:</span>
              <span className="font-mono text-dark-300">{formatAddress(event.issuer)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-dark-500">By Admin:</span>
              <span className="font-mono text-dark-300">{formatAddress(event.admin)}</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!account) {
    return (
      <Layout>
        <NotConnected
          message="Connect your wallet to view your transaction history"
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
        <h1 className="text-2xl font-bold text-dark-100">Transaction Log</h1>
        <p className="text-dark-400">View all blockchain events and transactions</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-dark-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All Events</option>
              <option value="CertificateIssued">Certificates Issued</option>
              <option value="CertificateRevoked">Certificates Revoked</option>
              <option value="IssuerAdded">Issuers Added</option>
              <option value="IssuerRemoved">Issuers Removed</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMyOnly}
              onChange={(e) => setShowMyOnly(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-dark-300">Show only my transactions</span>
          </label>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Events Found"
          message={filter !== 'all' || showMyOnly
            ? "No events match your filter criteria"
            : "No blockchain events recorded yet"
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event, idx) => {
            const eventType = EVENT_TYPES[event.type] || {
              icon: FileText,
              color: 'text-dark-400',
              bgColor: 'bg-dark-700',
              label: event.type,
            };
            const Icon = eventType.icon;

            return (
              <div key={event.txHash + idx} className="glass-card p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${eventType.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${eventType.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-medium ${eventType.color}`}>{eventType.label}</span>
                      {event.isPending && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="text-sm">{renderEventDetails(event)}</div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(event.timestamp)}
                      </div>
                      {event.blockNumber && (
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          Block {event.blockNumber}
                        </div>
                      )}
                      {event.txHash && networkInfo?.blockExplorer && (
                        <a
                          href={`${networkInfo.blockExplorer}/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary-400 hover:text-primary-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Explorer
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

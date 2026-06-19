import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import { useContractEvents } from '../hooks/useContractEvents';
import { Layout } from '../components/layout/Layout';
import {
  LoadingSpinner,
  EmptyState,
  NotConnected,
} from '../components/common/States';
import { formatAddress, formatTimeAgo } from '../utils/format';
import {
  Activity,
  UserPlus,
  UserMinus,
  FileText,
  ExternalLink,
  Filter,
  Award,
  ShieldCheck,
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
  DOCUMENT_NOTARY: {
    icon: ShieldCheck,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    label: 'Document Notary',
  },
};

function getSortTime(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLocalTransaction(tx) {
  const normalizedType = tx.type === 'notarize' ? 'DOCUMENT_NOTARY' : tx.type;

  const timestamp =
    tx.completedAt ||
    tx.updatedAt ||
    tx.createdAt ||
    tx.timestamp ||
    new Date().toISOString();

  return {
    ...tx,
    type: normalizedType,
    timestamp,
    txHash: tx.txHash || tx.hash || null,
    hash: tx.hash || tx.txHash || null,
    isLocal: true,
    isPending: ['preparing', 'pending', 'submitted'].includes(tx.status),
    sortTime: getSortTime(timestamp),
  };
}

function normalizeContractEvent(event) {
  return {
    ...event,
    isLocal: false,
    sortTime: getSortTime(event.timestamp),
  };
}

export function TransactionLogPage() {
  const { account, networkInfo, isConnecting, connectWallet } = useWeb3();
  const { transactions } = useTransactions();
  const { events, isLoading } = useContractEvents();

  const [filter, setFilter] = useState('all');
  const [showMyOnly, setShowMyOnly] = useState(false);

  const allEvents = useMemo(() => {
    const contractEvents = events.map(normalizeContractEvent);

    /**
     * Quan trọng:
     * Không chỉ lấy pending.
     * Phải lấy tất cả local transactions, gồm:
     * - preparing
     * - pending
     * - success
     * - failed
     * - already_exists
     */
    const localTransactions = transactions.map(normalizeLocalTransaction);

    return [...contractEvents, ...localTransactions].sort(
      (a, b) => b.sortTime - a.sortTime
    );
  }, [events, transactions]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (filter !== 'all' && event.type !== filter) return false;

      if (showMyOnly && account) {
        const lowerAccount = account.toLowerCase();

        const isMyEvent =
          event.issuer?.toLowerCase?.() === lowerAccount ||
          event.recipient?.toLowerCase?.() === lowerAccount ||
          event.admin?.toLowerCase?.() === lowerAccount ||
          event.from?.toLowerCase?.() === lowerAccount ||
          event.submitter?.toLowerCase?.() === lowerAccount;

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
              <span className="font-mono text-dark-300">
                {formatAddress(event.issuer)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-dark-500">Recipient:</span>
              <span className="font-mono text-dark-300">
                {formatAddress(event.recipient)}
              </span>
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
              <span className="font-mono text-dark-300">
                {formatAddress(event.revokedBy)}
              </span>
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
              <span className="font-mono text-dark-300">
                {formatAddress(event.issuer)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-dark-500">By Admin:</span>
              <span className="font-mono text-dark-300">
                {formatAddress(event.admin)}
              </span>
            </div>
          </div>
        );

      case 'DOCUMENT_NOTARY':
        return (
          <div className="space-y-2">
            {event.description && (
              <div className="flex items-start gap-2">
                <span className="text-dark-500">Description:</span>
                <span className="text-dark-300">{event.description}</span>
              </div>
            )}

            {event.merkleRoot && (
              <div>
                <span className="text-dark-500">Merkle Root:</span>
                <p className="font-mono text-primary-400 break-all mt-1">
                  {event.merkleRoot}
                </p>
              </div>
            )}

            {event.fileCount !== undefined && event.fileCount !== null && (
              <div className="flex items-center gap-2">
                <span className="text-dark-500">File Count:</span>
                <span className="text-dark-300">{event.fileCount}</span>
              </div>
            )}

            {event.from && (
              <div className="flex items-center gap-2">
                <span className="text-dark-500">Submitter:</span>
                <span className="font-mono text-dark-300">
                  {formatAddress(event.from)}
                </span>
              </div>
            )}

            {event.contract && (
              <div className="flex items-center gap-2">
                <span className="text-dark-500">Contract:</span>
                <span className="text-dark-300">{event.contract}</span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {event.description && (
              <p className="text-dark-300">{event.description}</p>
            )}

            {event.merkleRoot && (
              <div>
                <span className="text-dark-500">Merkle Root:</span>
                <p className="font-mono text-primary-400 break-all mt-1">
                  {event.merkleRoot}
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  const getStatusBadge = (event) => {
    const status = event.status;

    if (!status) return null;

    const className =
      status === 'success' || status === 'confirmed'
        ? 'bg-green-500/20 text-green-400'
        : status === 'failed'
        ? 'bg-red-500/20 text-red-400'
        : status === 'already_exists'
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-blue-500/20 text-blue-400';

    const label =
      status === 'already_exists'
        ? 'Already Exists'
        : status === 'success'
        ? 'Success'
        : status === 'confirmed'
        ? 'Confirmed'
        : status === 'preparing'
        ? 'Preparing'
        : status === 'pending'
        ? 'Pending'
        : status;

    return (
      <span className={`px-2 py-0.5 text-xs rounded ${className}`}>
        {label}
      </span>
    );
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
        <p className="text-dark-400">
          View all blockchain events and local transaction activities
        </p>
      </div>

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
              <option value="DOCUMENT_NOTARY">Document Notary</option>
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

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Events Found"
          message={
            filter !== 'all' || showMyOnly
              ? 'No events match your filter criteria'
              : 'No blockchain events or local transactions recorded yet'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event, idx) => {
            const eventType = EVENT_TYPES[event.type] || {
              icon: FileText,
              color: 'text-dark-400',
              bgColor: 'bg-dark-700',
              label: event.title || event.type || 'Transaction',
            };

            const Icon = eventType.icon;
            const txHash = event.txHash || event.hash;

            return (
              <div
                key={event.id || txHash || `${event.type}-${idx}`}
                className="glass-card p-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${eventType.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${eventType.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`font-medium ${eventType.color}`}>
                        {event.title || eventType.label}
                      </span>

                      {event.isPending && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                          Pending
                        </span>
                      )}

                      {event.isLocal && (
                        <span className="px-2 py-0.5 text-xs bg-dark-700 text-dark-300 rounded">
                          Local Log
                        </span>
                      )}

                      {getStatusBadge(event)}
                    </div>

                    <div className="text-sm">{renderEventDetails(event)}</div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-dark-500">
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

                      {txHash && networkInfo?.blockExplorer && (
                        <a
                          href={`${networkInfo.blockExplorer}/tx/${txHash}`}
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
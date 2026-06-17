import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useCertificates } from '../hooks/useCertificates';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner, EmptyState } from '../components/common/States';
import { StatusBadge, TypeBadge, RoleBadge } from '../components/common/Badges';
import { AddressDisplay } from '../components/common/Displays';
import { formatDate, formatAddress } from '../utils/format';
import {
  Award,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  User,
  Building2,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export function CertificatesPage() {
  const { account, isAdmin, isIssuer } = useWeb3();
  const { certificates, isLoading } = useCertificates();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCerts = useMemo(() => {
    return certificates.filter(cert => {
      const matchesSearch =
        cert.certId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || cert.statusLabel === statusFilter;
      const matchesType = typeFilter === 'all' || cert.certType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [certificates, searchQuery, statusFilter, typeFilter]);

  const paginatedCerts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCerts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCerts, currentPage]);

  const totalPages = Math.ceil(filteredCerts.length / ITEMS_PER_PAGE);

  const certTypes = useMemo(() => {
    const types = new Set(certificates.map(c => c.certType));
    return Array.from(types);
  }, [certificates]);

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
        <h1 className="text-2xl font-bold text-dark-100">All Certificates</h1>
        <p className="text-dark-400">Browse and search all certificates on the blockchain</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500"
              style={{ pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search by ID, name, or address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field w-full"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="select-field"
            >
              <option value="all">All Status</option>
              <option value="Valid">Valid</option>
              <option value="Revoked">Revoked</option>
              <option value="Expired">Expired</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="select-field"
            >
              <option value="all">All Types</option>
              {certTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredCerts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Certificates Found"
          message={searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
            ? "No certificates match your search criteria"
            : "No certificates have been issued yet"
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedCerts.map(cert => (
              <Link
                key={cert.certId}
                to={`/certificate/${cert.certId}`}
                className="glass-card p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-primary-500/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-dark-100 truncate">{cert.certName}</h3>
                      <TypeBadge type={cert.certType} />
                    </div>
                    <p className="text-sm font-mono text-primary-400">{cert.certId}</p>
                  </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-dark-500" />
                    <span className="text-dark-400">To:</span>
                    <span className="font-mono text-dark-300">{formatAddress(cert.recipient)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-dark-500" />
                    <span className="text-dark-400">By:</span>
                    <span className="font-mono text-dark-300">{formatAddress(cert.issuer)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-dark-500" />
                    <span className="text-dark-300">{formatDate(cert.issuedAt)}</span>
                  </div>
                  <StatusBadge status={cert.statusLabel} />
                  <Eye className="w-5 h-5 text-dark-500" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-dark-400">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCerts.length)} of {filteredCerts.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  className="btn-ghost p-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="text-dark-500 px-2">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg ${
                          page === currentPage
                            ? 'bg-primary-500 text-white'
                            : 'text-dark-300 hover:bg-dark-700'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-ghost p-2 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

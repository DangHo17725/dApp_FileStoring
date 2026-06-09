import { useState, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useIssuerManagement } from '../hooks/useIssuerManagement';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner, EmptyState, NotConnected, PermissionDenied } from '../components/common/States';
import { AddressDisplay } from '../components/common/Displays';
import { RoleBadge } from '../components/common/Badges';
import { formatAddress, isValidAddress } from '../utils/format';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Shield,
  Crown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export function IssuerManagementPage() {
  const { account, isAdmin, networkInfo, isConnecting, connectWallet } = useWeb3();
  const { issuers, addIssuer, removeIssuer, isLoading } = useIssuerManagement();

  const [newIssuerAddress, setNewIssuerAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingAddress, setRemovingAddress] = useState(null);

  const filteredIssuers = useMemo(() => {
    if (!searchQuery) return issuers;
    return issuers.filter(issuer =>
      issuer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [issuers, searchQuery]);

  const handleAddIssuer = async (e) => {
    e.preventDefault();
    
    if (!newIssuerAddress.trim()) {
      toast.error('Please enter an address');
      return;
    }

    if (!isValidAddress(newIssuerAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    if (issuers.includes(newIssuerAddress.toLowerCase())) {
      toast.error('This address is already an issuer');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addIssuer(newIssuerAddress);
      if (result?.success) {
        setNewIssuerAddress('');
      }
    } catch (error) {
      console.error('Add issuer error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveIssuer = async (address) => {
    if (address.toLowerCase() === account?.toLowerCase()) {
      toast.error('You cannot remove yourself as an issuer');
      return;
    }

    setRemovingAddress(address);
    try {
      await removeIssuer(address);
    } catch (error) {
      console.error('Remove issuer error:', error);
    } finally {
      setRemovingAddress(null);
    }
  };

  if (!account) {
    return (
      <Layout>
        <NotConnected
          message="Connect your wallet to manage issuers"
          onConnect={connectWallet}
          isConnecting={isConnecting}
        />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <PermissionDenied message="Only administrators can manage issuers. Please contact the contract owner if you need admin access." />
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
        <h1 className="text-2xl font-bold text-dark-100">Issuer Management</h1>
        <p className="text-dark-400">Add or remove certificate issuers</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Add New Issuer */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6">
            <h2 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-400" />
              Add New Issuer
            </h2>
            <form onSubmit={handleAddIssuer}>
              <div className="mb-4">
                <label className="label">Wallet Address</label>
                <input
                  type="text"
                  value={newIssuerAddress}
                  onChange={(e) => setNewIssuerAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isAdding || !newIssuerAddress}
                className="btn-primary w-full justify-center"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Add Issuer
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-dark-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-dark-200 mb-2">About Issuers</h3>
              <ul className="text-xs text-dark-400 space-y-1">
                <li>- Issuers can create new certificates</li>
                <li>- Issuers can revoke certificates they issued</li>
                <li>- Issuers cannot manage other issuers</li>
                <li>- Only admins can add/remove issuers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Issuers List */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                Authorized Issuers ({issuers.length})
              </h2>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>

            {filteredIssuers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery ? "No Results" : "No Issuers"}
                message={searchQuery
                  ? "No issuers match your search"
                  : "No issuers have been added yet"
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredIssuers.map(issuer => {
                  const isCurrentUser = issuer.toLowerCase() === account?.toLowerCase();
                  const isRemoving = removingAddress === issuer;

                  return (
                    <div
                      key={issuer}
                      className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-dark-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                          {isCurrentUser ? (
                            <Crown className="w-5 h-5 text-amber-400" />
                          ) : (
                            <Shield className="w-5 h-5 text-primary-400" />
                          )}
                        </div>
                        <div>
                          <AddressDisplay address={issuer} networkInfo={networkInfo} />
                          <div className="flex items-center gap-2 mt-1">
                            <RoleBadge role="Issuer" />
                            {isCurrentUser && (
                              <span className="text-xs text-amber-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <button
                          onClick={() => handleRemoveIssuer(issuer)}
                          disabled={isRemoving}
                          className="btn-ghost text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <UserMinus className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

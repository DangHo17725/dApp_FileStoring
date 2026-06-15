import { useWeb3 } from '../../context/Web3Context';
import { formatAddress } from '../../utils/format';
import { Wallet, LogOut, AlertTriangle, ExternalLink } from 'lucide-react';

export function Topbar() {
  const {
    account,
    networkInfo,
    isWrongNetwork,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getUserRole,
    CONTRACT_ADDRESS,
  } = useWeb3();

  const role = getUserRole();

  const roleColors = {
    Admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Issuer: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    Holder: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Public: 'bg-dark-500/20 text-dark-400 border-dark-500/30',
  };

  return (
    <header className="h-16 bg-dark-900/50 border-b border-dark-700/50 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4 lg:ml-0 ml-12">
        {/* Network Badge */}
        {networkInfo && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-700">
            <div className={`w-2 h-2 rounded-full ${isWrongNetwork ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="text-sm text-dark-300">{networkInfo.name}</span>
          </div>
        )}

        {/* Contract Address */}
        {CONTRACT_ADDRESS && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-700">
            <span className="text-xs text-dark-500">Contract:</span>
            <span className="font-mono text-xs text-primary-400">{formatAddress(CONTRACT_ADDRESS)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Wrong Network Warning */}
        {isWrongNetwork && (
          <button
            onClick={() => switchNetwork('sepolia')}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 text-sm hover:bg-amber-500/30 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Switch Network</span>
          </button>
        )}

        {/* User Role Badge */}
        {account && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${roleColors[role]}`}>
            {role}
          </div>
        )}

        {/* Wallet Connection */}
        {account ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="font-mono text-sm text-dark-200">{formatAddress(account)}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-dark-400 hover:text-dark-200"
              title="Disconnect"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary"
          >
            <Wallet className="w-5 h-5" />
            <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          </button>
        )}
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { formatAddress } from '../../utils/format';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  FolderOpen,
  ShieldCheck,
  History,
  Users,
  PlayCircle,
  ServerCog,
  Menu,
  X,
  FileCheck,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/issue', label: 'Issue Certificate', icon: FilePlus },
  { path: '/certificates', label: 'Certificates', icon: FileText },
  { path: '/my-certificates', label: 'My Certificates', icon: FolderOpen },
  { path: '/verify', label: 'Verify Certificate', icon: ShieldCheck },
  { path: '/notarize', label: 'Document Notary', icon: FileCheck },
  { path: '/transactions', label: 'Transaction Log', icon: History },
  { path: '/verify-batch', label: 'Verify Batch', icon: ShieldCheck },
  { path: '/issuers', label: 'Issuer Management', icon: Users },
  { path: '/demo', label: 'Demo Flow', icon: PlayCircle },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { account } = useWeb3();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filteredItems = navItems;

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-dark-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">CertiChain</h1>
            <p className="text-xs text-dark-500">Blockchain Certificates</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {account && (
        <div className="p-4 border-t border-dark-700/50">
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm text-primary-400">{formatAddress(account)}</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg border border-dark-700"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-dark-900/50 border-r border-dark-700/50 flex-col fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-700 flex flex-col z-50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

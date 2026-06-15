import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import {
  ShieldCheck,
  FileCheck,
  Search,
  Fingerprint,
  History,
  Wallet,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: FileCheck,
    title: 'Issue Certificates',
    description: 'Issue tamper-proof digital certificates stored on the Ethereum blockchain with cryptographic proofs.',
  },
  {
    icon: Search,
    title: 'Verify Authenticity',
    description: 'Instantly verify any certificate by ID, QR code, or document hash without requiring a wallet.',
  },
  {
    icon: Fingerprint,
    title: 'Tamper Detection',
    description: 'Detect any modifications to certificates using SHA-256 hash comparison against on-chain records.',
  },
  {
    icon: History,
    title: 'Blockchain Audit Trail',
    description: 'Complete transparency with immutable transaction history and event logs on the blockchain.',
  },
];

export function LandingPage() {
  const { account, connectWallet, isConnecting } = useWeb3();

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-dark-950 to-accent-900/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <ShieldCheck className="w-8 h-8 text-dark-950" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-center mb-6">
            <span className="gradient-text">CertiChain</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-dark-300 text-center max-w-3xl mx-auto mb-4 text-balance">
            Blockchain Certificate Management & Verification dApp
          </p>

          {/* Description */}
          <p className="text-dark-400 text-center max-w-2xl mx-auto mb-10">
            Issue, manage, revoke, and verify digital certificates using Ethereum smart contracts.
            Secure, transparent, and tamper-proof credential management for the Web3 era.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {account ? (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary text-lg px-8 py-3"
              >
                <Wallet className="w-5 h-5" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
            <Link
              to="/verify"
              className="btn-secondary text-lg px-8 py-3"
            >
              Verify Certificate
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              to="/demo"
              className="btn-ghost text-lg px-6 py-3"
            >
              View Demo Flow
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          <span className="gradient-text">Core Features</span>
        </h2>
        <p className="text-dark-400 text-center max-w-2xl mx-auto mb-12">
          Everything you need to manage and verify digital credentials on the blockchain
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass-card-hover p-6 flex flex-col"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-400 text-sm flex-1">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-dark-800">
        <p className="text-center text-dark-500 text-sm mb-6">Built with</p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-dark-400">
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">React + Vite</span>
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">Tailwind CSS</span>
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">Solidity</span>
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">ethers.js</span>
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">Hardhat</span>
          <span className="px-4 py-2 bg-dark-900 rounded-lg border border-dark-700">MetaMask</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useDemo } from '../context/DemoContext';
import { Layout } from '../components/layout/Layout';
import { NotConnected } from '../components/common/States';
import {
  Play,
  CheckCircle,
  Circle,
  ChevronRight,
  Wallet,
  FileText,
  Award,
  Shield,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const DEMO_STEPS = [
  {
    id: 1,
    title: 'Connect Wallet',
    description: 'Connect your MetaMask wallet to the dApp',
    icon: Wallet,
    path: null,
    action: 'connect',
  },
  {
    id: 2,
    title: 'Explore Dashboard',
    description: 'View the dashboard and understand the system overview',
    icon: FileText,
    path: '/dashboard',
    action: 'navigate',
  },
  {
    id: 3,
    title: 'Issue a Certificate',
    description: 'Create a new certificate with document hash',
    icon: Award,
    path: '/issue',
    action: 'navigate',
  },
  {
    id: 4,
    title: 'Verify Certificate',
    description: 'Verify the certificate you just issued',
    icon: Shield,
    path: '/verify',
    action: 'navigate',
  },
  {
    id: 5,
    title: 'Manage Issuers (Admin)',
    description: 'Add or remove certificate issuers',
    icon: Users,
    path: '/issuers',
    action: 'navigate',
  },
];

export function DemoFlowPage() {
  const navigate = useNavigate();
  const { account, isAdmin, isIssuer, isConnecting, connectWallet } = useWeb3();
  const { completedSteps, markStepComplete, resetDemo } = useDemo();

  const [isStarting, setIsStarting] = useState(false);

  const getStepStatus = (step) => {
    if (step.id === 1 && account) return 'completed';
    if (completedSteps.includes(step.id)) return 'completed';
    
    const previousStep = DEMO_STEPS.find(s => s.id === step.id - 1);
    if (!previousStep) return 'active';
    if (step.id === 2 && account) return 'active';
    if (completedSteps.includes(previousStep.id)) return 'active';
    return 'locked';
  };

  const handleStepAction = async (step) => {
    if (step.action === 'connect') {
      await connectWallet();
    } else if (step.path) {
      navigate(step.path);
    }
  };

  const startDemo = async () => {
    setIsStarting(true);
    resetDemo();
    if (!account) {
      await connectWallet();
    }
    setIsStarting(false);
    markStepComplete(1);
    navigate('/dashboard');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-dark-100 mb-2">Interactive Demo</h1>
          <p className="text-dark-400">
            Follow this guided tour to explore all features of CertiChain
          </p>
        </div>

        {/* Progress */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-dark-100">Your Progress</h2>
              <p className="text-sm text-dark-400">
                {completedSteps.length} of {DEMO_STEPS.length} steps completed
              </p>
            </div>
            <button onClick={startDemo} disabled={isStarting} className="btn-primary">
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : completedSteps.length > 0 ? (
                <>
                  <Play className="w-5 h-5" />
                  Restart Demo
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Demo
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
              style={{ width: `${(completedSteps.length / DEMO_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* User Info */}
        {account && (
          <div className="glass-card p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Connected as</p>
                <p className="font-mono text-dark-200">{account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <span className="px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-full">
                  Admin
                </span>
              )}
              {isIssuer && (
                <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full">
                  Issuer
                </span>
              )}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {DEMO_STEPS.map((step, index) => {
            const status = getStepStatus(step);
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`glass-card p-6 transition-all ${
                  status === 'active' ? 'border-primary-500/50 glow-border' :
                  status === 'locked' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-emerald-500/20' :
                    status === 'active' ? 'bg-primary-500/20' : 'bg-dark-700'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Icon className={`w-6 h-6 ${
                        status === 'active' ? 'text-primary-400' : 'text-dark-500'
                      }`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-dark-500">Step {step.id}</span>
                      {status === 'completed' && (
                        <span className="text-xs text-emerald-400">Completed</span>
                      )}
                      {status === 'active' && (
                        <span className="text-xs text-primary-400">Current</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-dark-100">{step.title}</h3>
                    <p className="text-sm text-dark-400">{step.description}</p>
                  </div>

                  {status !== 'locked' && (
                    <button
                      onClick={() => handleStepAction(step)}
                      disabled={isConnecting && step.action === 'connect'}
                      className={`btn-${status === 'completed' ? 'ghost' : 'primary'}`}
                    >
                      {isConnecting && step.action === 'connect' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {status === 'completed' ? 'Review' : 'Start'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Connector Line */}
                {index < DEMO_STEPS.length - 1 && (
                  <div className="absolute left-10 mt-2 w-0.5 h-4 bg-dark-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {completedSteps.length === DEMO_STEPS.length && (
          <div className="glass-card p-8 mt-8 text-center glow-border">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-dark-100 mb-2">Demo Complete!</h2>
            <p className="text-dark-400 mb-6">
              {"You've"} successfully explored all the main features of CertiChain
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
              <button onClick={resetDemo} className="btn-secondary">
                Restart Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

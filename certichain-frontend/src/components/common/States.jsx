import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2 className={`animate-spin text-primary-500 ${sizes[size]} ${className}`} />
  );
}

export function LoadingCard({ message = 'Loading...' }) {
  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-dark-400">{message}</p>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-dark-400">Loading...</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
      {Icon && (
        <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-dark-500" />
        </div>
      )}
      <h3 className="text-lg font-medium text-dark-200 mb-2">{title}</h3>
      {description && <p className="text-dark-500 mb-4 max-w-md">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorCard({ title = 'Error', message, onRetry }) {
  return (
    <div className="glass-card p-8 border-red-500/30">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
          <span className="text-2xl text-red-400">!</span>
        </div>
        <h3 className="text-lg font-medium text-red-400">{title}</h3>
        <p className="text-dark-400">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export function PermissionDenied({ message = 'You do not have permission to access this page.' }) {
  return (
    <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-amber-500/30">
      <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h3 className="text-xl font-medium text-amber-400 mb-2">Access Restricted</h3>
      <p className="text-dark-400 max-w-md">{message}</p>
    </div>
  );
}

export function NotConnected({ message = 'Please connect your wallet to continue.' }) {
  return (
    <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-primary-500/30">
      <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">🔗</span>
      </div>
      <h3 className="text-xl font-medium text-primary-400 mb-2">Wallet Not Connected</h3>
      <p className="text-dark-400 max-w-md">{message}</p>
    </div>
  );
}

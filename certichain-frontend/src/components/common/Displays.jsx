import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard, formatAddress, formatHash, getEtherscanUrl } from '../../utils/format';
import { useWeb3 } from '../../context/Web3Context';
import toast from 'react-hot-toast';

export function AddressDisplay({ address, label, showCopy = true, showLink = true }) {
  const [copied, setCopied] = useState(false);
  const { networkInfo } = useWeb3();

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const etherscanUrl = getEtherscanUrl('address', address, networkInfo);

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-dark-500">{label}</span>}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-primary-400">{formatAddress(address)}</span>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-dark-700 rounded transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-dark-400" />
            )}
          </button>
        )}
        {showLink && etherscanUrl && (
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-dark-700 rounded transition-colors"
            title="View on Etherscan"
          >
            <ExternalLink className="w-3.5 h-3.5 text-dark-400" />
          </a>
        )}
      </div>
    </div>
  );
}

export function HashDisplay({ hash, label, showCopy = true, showFull = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopied(true);
      toast.success('Hash copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-dark-500">{label}</span>}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-primary-400 break-all">
          {showFull ? hash : formatHash(hash)}
        </span>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-dark-700 rounded transition-colors flex-shrink-0"
            title="Copy hash"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-dark-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function TxHashDisplay({ hash, label }) {
  const [copied, setCopied] = useState(false);
  const { networkInfo } = useWeb3();

  const handleCopy = async () => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopied(true);
      toast.success('Transaction hash copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const etherscanUrl = getEtherscanUrl('tx', hash, networkInfo);

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-dark-500">{label}</span>}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-primary-400">{formatHash(hash)}</span>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-dark-700 rounded transition-colors"
          title="Copy hash"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-dark-400" />
          )}
        </button>
        {etherscanUrl && (
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-dark-700 rounded transition-colors"
            title="View on Etherscan"
          >
            <ExternalLink className="w-3.5 h-3.5 text-dark-400" />
          </a>
        )}
      </div>
    </div>
  );
}

export function TimestampDisplay({ timestamp, label }) {
  const date = timestamp ? new Date(Number(timestamp) * 1000) : null;
  const formatted = date ? date.toLocaleString() : 'N/A';

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-dark-500">{label}</span>}
      <span className="text-sm text-dark-200">{formatted}</span>
    </div>
  );
}

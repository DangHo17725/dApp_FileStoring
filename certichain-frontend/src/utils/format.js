/**
 * Format an Ethereum address to shortened form
 * @param {string} address - Full Ethereum address
 * @param {number} startChars - Number of characters at start
 * @param {number} endChars - Number of characters at end
 * @returns {string} Formatted address
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a bytes32 hash to shortened form
 * @param {string} hash - Full hash
 * @param {number} startChars - Number of characters at start
 * @param {number} endChars - Number of characters at end
 * @returns {string} Formatted hash
 */
export function formatHash(hash, startChars = 10, endChars = 8) {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format a Unix timestamp to readable date
 * @param {number|bigint} timestamp - Unix timestamp in seconds
 * @param {boolean} includeTime - Include time in output
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp, includeTime = false) {
  if (!timestamp || timestamp === 0n || timestamp === 0) return 'Never';
  
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const date = new Date(ts * 1000);
  
  if (includeTime) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a relative time from now
 * @param {number|bigint} timestamp - Unix timestamp in seconds
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp || timestamp === 0n || timestamp === 0) return 'Never';
  
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;
  
  if (absDiff < 60) return 'Just now';
  if (absDiff < 3600) {
    const mins = Math.floor(absDiff / 60);
    return isPast ? `${mins}m ago` : `in ${mins}m`;
  }
  if (absDiff < 86400) {
    const hours = Math.floor(absDiff / 3600);
    return isPast ? `${hours}h ago` : `in ${hours}h`;
  }
  if (absDiff < 2592000) {
    const days = Math.floor(absDiff / 86400);
    return isPast ? `${days}d ago` : `in ${days}d`;
  }
  
  return formatDate(timestamp);
}

/**
 * Format file size to human readable
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}

/**
 * Generate a unique certificate ID
 * @returns {string} Certificate ID
 */
export function generateCertId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Is valid
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get Etherscan URL for address/tx/block
 * @param {string} type - 'address', 'tx', or 'block'
 * @param {string} value - The value to link to
 * @param {object} networkInfo - Network configuration
 * @returns {string|null} Etherscan URL or null
 */
export function getEtherscanUrl(type, value, networkInfo) {
  if (!networkInfo?.blockExplorer || !value) return null;
  
  const typeMap = {
    address: 'address',
    tx: 'tx',
    block: 'block',
  };
  
  return `${networkInfo.blockExplorer}/${typeMap[type]}/${value}`;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if certificate is expired
 * @param {number|bigint} expiresAt - Expiration timestamp
 * @returns {boolean} Is expired
 */
export function isCertificateExpired(expiresAt) {
  if (!expiresAt || expiresAt === 0n || expiresAt === 0) return false;
  const ts = typeof expiresAt === 'bigint' ? Number(expiresAt) : expiresAt;
  return ts < Math.floor(Date.now() / 1000);
}

/**
 * Get certificate status with expiry check
 * @param {number} status - Status enum value
 * @param {number|bigint} expiresAt - Expiration timestamp
 * @returns {string} Status string
 */
export function getCertificateStatus(status, expiresAt) {
  if (status === 1) return 'Revoked';
  if (status === 2 || isCertificateExpired(expiresAt)) return 'Expired';
  return 'Valid';
}

/**
 * Get status badge class
 * @param {string} status - Status string
 * @returns {string} Tailwind class
 */
export function getStatusClass(status) {
  switch (status) {
    case 'Valid':
      return 'status-valid';
    case 'Revoked':
      return 'status-revoked';
    case 'Expired':
      return 'status-expired';
    default:
      return 'status-pending';
  }
}

/**
 * Format time ago (alias for formatRelativeTime)
 * @param {number|bigint} timestamp - Unix timestamp in seconds
 * @returns {string} Relative time string
 */
export function formatTimeAgo(timestamp) {
  return formatRelativeTime(timestamp);
}

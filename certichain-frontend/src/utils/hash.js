/**
 * Generate SHA-256 hash of a file using Web Crypto API
 * @param {File} file - File to hash
 * @returns {Promise<string>} Hex string of hash (with 0x prefix)
 */
export async function hashFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        // Match the original Rust backend Merkle implementation:
        // leaf hash = SHA256(0x00 || file_bytes).
        // This keeps browser fallback compatible with backend_api/original_backend.
        const fileBytes = new Uint8Array(arrayBuffer);
        const prefixed = new Uint8Array(fileBytes.length + 1);
        prefixed[0] = 0x00;
        prefixed.set(fileBytes, 1);
        const hashBuffer = await crypto.subtle.digest('SHA-256', prefixed);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate SHA-256 hash of a string (for metadata)
 * @param {string} data - String to hash
 * @returns {Promise<string>} Hex string of hash (with 0x prefix)
 */
export async function hashString(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate metadata hash from certificate data
 * @param {object} metadata - Certificate metadata object
 * @returns {Promise<string>} Hex string of hash
 */
export async function generateMetadataHash(metadata) {
  const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
  return hashString(metadataString);
}

/**
 * Validate file type for certificate documents
 * @param {File} file - File to validate
 * @returns {boolean} Is valid file type
 */
export function isValidFileType(file) {
  const validTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];
  return validTypes.includes(file.type);
}

/**
 * Get file extension
 * @param {string} filename - File name
 * @returns {string} Extension
 */
export function getFileExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Create download link for QR code
 * @param {string} dataUrl - Data URL of the QR code
 * @param {string} filename - Download filename
 */
export function downloadQRCode(dataUrl, filename = 'certificate-qr.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate verification URL for a certificate
 * @param {string} certId - Certificate ID
 * @returns {string} Verification URL
 */
export function getVerificationUrl(certId) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/verify?id=${encodeURIComponent(certId)}`;
}

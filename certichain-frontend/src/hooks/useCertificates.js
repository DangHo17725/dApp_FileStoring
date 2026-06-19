import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import toast from 'react-hot-toast';

export function useCertificates() {
  const { contract, account } = useWeb3();
  

  const { addTransaction, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);

  // Issue a new certificate
  const issueCertificate = useCallback(async (data) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'issue',
      status: 'pending',
      certId: data.certId,
      description: `Issuing certificate: ${data.certName}`,
    });

    try {
      const tx = await contract.issueCertificate(
        data.certId,
        data.certName,
        data.certType,
        data.documentHash,
        data.metadataHash,
        data.merkleRoot,
        data.recipient,
        data.expiresAt,
        data.ipfsCID || ''
      );

      updateTransaction(txRecord.id, {
        status: 'submitted',
        hash: tx.hash,
      });

      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'tx-confirm' });

      const receipt = await tx.wait();

      updateTransaction(txRecord.id, {
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
      });

      toast.dismiss('tx-confirm');
      toast.success('Certificate issued successfully!');

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        certId: data.certId,
      };
    } catch (error) {
      console.error('Issue certificate error FULL:', error);
      console.error('Error reason:', error?.reason);
      console.error('Error data:', error?.data);
      console.error('Issue certificate error:', error);
      updateTransaction(txRecord.id, {
        status: 'failed',
        error: error.message,
      });

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user');
      } else if (error.message?.includes('Certificate ID already exists')) {
        toast.error('Certificate ID already exists');
      } else {
        toast.error('Failed to issue certificate');
      }
      return null;
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-confirm');
    }
  }, [contract, account, addTransaction, updateTransaction]);

  // Revoke a certificate
  const revokeCertificate = useCallback(async (certId, reason) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return false;
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'revoke',
      status: 'pending',
      certId,
      description: `Revoking certificate: ${certId}`,
    });

    try {
      const tx = await contract.revokeCertificate(certId, reason);

      updateTransaction(txRecord.id, {
        status: 'submitted',
        hash: tx.hash,
      });

      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'tx-confirm' });

      const receipt = await tx.wait();

      updateTransaction(txRecord.id, {
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
      });

      toast.dismiss('tx-confirm');
      toast.success('Certificate revoked successfully!');

      return true;
    } catch (error) {
      console.error('Revoke certificate error:', error);
      updateTransaction(txRecord.id, {
        status: 'failed',
        error: error.message,
      });

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user');
      } else {
        toast.error('Failed to revoke certificate');
      }
      return false;
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-confirm');
    }
  }, [contract, account, addTransaction, updateTransaction]);

  // Get certificate by ID
  const getCertificate = useCallback(async (certId) => {
    if (!contract) return null;

    try {
      const exists = await contract.certificateExists(certId);
      if (!exists) return null;

      const cert = await contract.getCertificate(certId);
      return {
        certId: cert.certId,
        certName: cert.certName,
        certType: cert.certType,
        documentHash: cert.documentHash,
        metadataHash: cert.metadataHash,
        merkleRoot: cert.merkleRoot,
        issuer: cert.issuer,
        recipient: cert.recipient,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        status: Number(cert.status),
        revokedReason: cert.revokedReason,
        ipfsCID: cert.ipfsCID || '',
      };
    } catch (error) {
      console.error('Get certificate error:', error);
      return null;
    }
  }, [contract]);
  const loadAllCertificates = useCallback(async () => {
    if (!contract) return;
    setIsLoading(true);
    try {
      const ids = await contract.getAllCertificateIds();
      const statusLabels = ['Valid', 'Revoked', 'Expired'];

      const certs = await Promise.all(
        ids.map(async (id) => {
          const cert = await contract.getCertificate(id);
          return {
            certId:        cert.certId,
            certName:      cert.certName,
            certType:      cert.certType,
            documentHash:  cert.documentHash,
            metadataHash:  cert.metadataHash,
            issuer:        cert.issuer,
            recipient:     cert.recipient,
            issuedAt:      Number(cert.issuedAt),
            expiresAt:     Number(cert.expiresAt),
            status:        Number(cert.status),
            statusLabel:   statusLabels[Number(cert.status)] || 'Unknown',
            revokedReason: cert.revokedReason,
            ipfsCID:       cert.ipfsCID || '',
          };
        })
      );
      setCertificates(certs);
    } catch (error) {
      console.error('Load all certificates error:', error);
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);
  useEffect(() => {
    loadAllCertificates();
  }, [loadAllCertificates]);
  // Verify certificate
  const verifyCertificate = useCallback(async (certId, documentHash = null) => {
    if (!contract) return null;

    try {
      const hashToCheck = documentHash || '0x0000000000000000000000000000000000000000000000000000000000000000';
      const result = await contract.verifyCertificate(certId, hashToCheck);

      return {
        exists: result.exists,
        hashMatches: result.hashMatches,
        status: Number(result.status),
        issuer: result.issuer,
        recipient: result.recipient,
        issuedAt: result.issuedAt,
        expiresAt: result.expiresAt,
        merkleRoot: result.merkleRoot
      };
    } catch (error) {
      console.error('Verify certificate error:', error);
      return null;
    }
  }, [contract]);

  // Check if certificate is valid
  const isCertificateValid = useCallback(async (certId) => {
    if (!contract) return false;

    try {
      return await contract.isCertificateValid(certId);
    } catch (error) {
      console.error('Check valid error:', error);
      return false;
    }
  }, [contract]);

  // Get all certificate IDs
  const getAllCertificateIds = useCallback(async () => {
    if (!contract) return [];

    try {
      return await contract.getAllCertificateIds();
    } catch (error) {
      console.error('Get all IDs error:', error);
      return [];
    }
  }, [contract]);

  // Get certificates by recipient
  const getCertificatesByRecipient = useCallback(async (recipientAddress) => {
    if (!contract) return [];

    try {
      return await contract.getCertificatesByRecipient(recipientAddress);
    } catch (error) {
      console.error('Get by recipient error:', error);
      return [];
    }
  }, [contract]);

  // Get certificates by issuer
  const getCertificatesByIssuer = useCallback(async (issuerAddress) => {
    if (!contract) return [];

    try {
      return await contract.getCertificatesByIssuer(issuerAddress);
    } catch (error) {
      console.error('Get by issuer error:', error);
      return [];
    }
  }, [contract]);

  // Get total certificates count
  const getTotalCertificates = useCallback(async () => {
    if (!contract) return 0;

    try {
      const total = await contract.getTotalCertificates();
      return Number(total);
    } catch (error) {
      console.error('Get total error:', error);
      return 0;
    }
  }, [contract]);

  return {
    certificates,        
    loadAllCertificates, 
    isLoading,
    issueCertificate,
    revokeCertificate,
    getCertificate,
    verifyCertificate,
    isCertificateValid,
    getAllCertificateIds,
    getCertificatesByRecipient,
    getCertificatesByIssuer,
    getTotalCertificates,
  };
}

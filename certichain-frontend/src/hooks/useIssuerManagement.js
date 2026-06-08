import { useState, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import toast from 'react-hot-toast';

export function useIssuerManagement() {
  const { contract, account, isAdmin } = useWeb3();
  const { addTransaction, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState(false);

  // Grant issuer role
  const grantIssuer = useCallback(async (address) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (!isAdmin) {
      toast.error('Only admin can grant issuer role');
      return false;
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'grantIssuer',
      status: 'pending',
      description: `Granting issuer role to ${address}`,
    });

    try {
      const tx = await contract.grantIssuer(address);

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
      toast.success('Issuer role granted successfully!');

      return true;
    } catch (error) {
      console.error('Grant issuer error:', error);
      updateTransaction(txRecord.id, {
        status: 'failed',
        error: error.message,
      });

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user');
      } else {
        toast.error('Failed to grant issuer role');
      }
      return false;
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-confirm');
    }
  }, [contract, account, isAdmin, addTransaction, updateTransaction]);

  // Revoke issuer role
  const revokeIssuer = useCallback(async (address) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (!isAdmin) {
      toast.error('Only admin can revoke issuer role');
      return false;
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'revokeIssuer',
      status: 'pending',
      description: `Revoking issuer role from ${address}`,
    });

    try {
      const tx = await contract.revokeIssuer(address);

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
      toast.success('Issuer role revoked successfully!');

      return true;
    } catch (error) {
      console.error('Revoke issuer error:', error);
      updateTransaction(txRecord.id, {
        status: 'failed',
        error: error.message,
      });

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user');
      } else {
        toast.error('Failed to revoke issuer role');
      }
      return false;
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-confirm');
    }
  }, [contract, account, isAdmin, addTransaction, updateTransaction]);

  // Check if address is issuer
  const checkIsIssuer = useCallback(async (address) => {
    if (!contract) return false;

    try {
      return await contract.isIssuer(address);
    } catch (error) {
      console.error('Check issuer error:', error);
      return false;
    }
  }, [contract]);

  // Check if address is admin
  const checkIsAdmin = useCallback(async (address) => {
    if (!contract) return false;

    try {
      return await contract.isAdmin(address);
    } catch (error) {
      console.error('Check admin error:', error);
      return false;
    }
  }, [contract]);

  return {
    isLoading,
    grantIssuer,
    revokeIssuer,
    checkIsIssuer,
    checkIsAdmin,
  };
}

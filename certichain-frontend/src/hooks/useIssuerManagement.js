import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import toast from 'react-hot-toast';

export function useIssuerManagement() {
  const { contract, account, isAdmin } = useWeb3();
  const { addTransaction, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState(false);
  const [issuers, setIssuers] = useState([]);

  // Load issuer list from contract events (best-effort).
  const loadIssuers = useCallback(async () => {
    if (!contract) return;
    setIsLoading(true);
    try {
      const safeQuery = async (eventName) => {
        try {
          return await contract.queryFilter(eventName);
        } catch {
          return [];
        }
      };

      const granted = (await safeQuery('IssuerGranted')).map(l => ({ ...l, _t: 'grant' }));
      const revoked = (await safeQuery('IssuerRevoked')).map(l => ({ ...l, _t: 'revoke' }));

      // Sắp xếp theo thứ tự block để xử lý grant/revoke đúng trình tự
      const logs = [...granted, ...revoked].sort(
        (a, b) => (a.blockNumber - b.blockNumber) || ((a.index ?? 0) - (b.index ?? 0))
      );

      const active = new Set();
      for (const log of logs) {
        const addr = (log.args?.[0] || '').toLowerCase();
        if (!addr) continue;
        if (log._t === 'grant') active.add(addr);
        else active.delete(addr);
      }

      setIssuers([...active]);
    } catch (error) {
      console.error('Load issuers error:', error);
      setIssuers([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  // Tự load khi contract sẵn sàng
  useEffect(() => {
    loadIssuers();
  }, [loadIssuers]);

  // Add issuer (grant role)
  const addIssuer = useCallback(async (address) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return { success: false };
    }
    if (!isAdmin) {
      toast.error('Only admin can add issuers');
      return { success: false };
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'grantIssuer',
      status: 'pending',
      description: `Granting issuer role to ${address}`,
    });

    try {
      const tx = await contract.grantIssuer(address);
      updateTransaction(txRecord.id, { status: 'submitted', hash: tx.hash });
      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'tx-confirm' });

      const receipt = await tx.wait();
      updateTransaction(txRecord.id, { status: 'confirmed', blockNumber: receipt.blockNumber });

      toast.dismiss('tx-confirm');
      toast.success('Issuer added successfully!');

      // Cập nhật danh sách ngay (optimistic)
      const lower = address.toLowerCase();
      setIssuers(prev => (prev.includes(lower) ? prev : [...prev, lower]));

      return { success: true };
    } catch (error) {
      console.error('Add issuer error:', error);
      updateTransaction(txRecord.id, { status: 'failed', error: error.message });
      toast.error(
        error.code === 'ACTION_REJECTED' ? 'Transaction rejected by user' : 'Failed to add issuer'
      );
      return { success: false };
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-confirm');
    }
  }, [contract, account, isAdmin, addTransaction, updateTransaction]);

  // Remove issuer (revoke role)
  const removeIssuer = useCallback(async (address) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet');
      return { success: false };
    }
    if (!isAdmin) {
      toast.error('Only admin can remove issuers');
      return { success: false };
    }

    setIsLoading(true);
    const txRecord = addTransaction({
      type: 'revokeIssuer',
      status: 'pending',
      description: `Revoking issuer role from ${address}`,
    });

    try {
      const tx = await contract.revokeIssuer(address);
      updateTransaction(txRecord.id, { status: 'submitted', hash: tx.hash });
      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'tx-confirm' });

      const receipt = await tx.wait();
      updateTransaction(txRecord.id, { status: 'confirmed', blockNumber: receipt.blockNumber });

      toast.dismiss('tx-confirm');
      toast.success('Issuer removed successfully!');

      const lower = address.toLowerCase();
      setIssuers(prev => prev.filter(a => a !== lower));

      return { success: true };
    } catch (error) {
      console.error('Remove issuer error:', error);
      updateTransaction(txRecord.id, { status: 'failed', error: error.message });
      toast.error(
        error.code === 'ACTION_REJECTED' ? 'Transaction rejected by user' : 'Failed to remove issuer'
      );
      return { success: false };
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
    issuers,
    isLoading,
    loadIssuers,
    addIssuer,
    removeIssuer,
    grantIssuer: addIssuer,
    revokeIssuer: removeIssuer,
    checkIsIssuer,
    checkIsAdmin,
  };
}
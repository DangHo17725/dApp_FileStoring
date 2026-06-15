import { createContext, useContext, useState, useCallback } from 'react';

const TransactionContext = createContext(null);

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [pendingTx, setPendingTx] = useState(null);

  // Add a new transaction to history
  const addTransaction = useCallback((tx) => {
    const newTx = {
      ...tx,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev].slice(0, 100)); // Keep last 100
    return newTx;
  }, []);

  // Update transaction status
  const updateTransaction = useCallback((id, updates) => {
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
    );
  }, []);

  // Set pending transaction (for UI display)
  const setPending = useCallback((tx) => {
    setPendingTx(tx);
  }, []);

  // Clear pending transaction
  const clearPending = useCallback(() => {
    setPendingTx(null);
  }, []);

  // Get transactions by type
  const getTransactionsByType = useCallback((type) => {
    return transactions.filter(tx => tx.type === type);
  }, [transactions]);

  // Get transactions by certificate ID
  const getTransactionsByCertId = useCallback((certId) => {
    return transactions.filter(tx => tx.certId === certId);
  }, [transactions]);

  const value = {
    transactions,
    pendingTx,
    addTransaction,
    updateTransaction,
    setPending,
    clearPending,
    getTransactionsByType,
    getTransactionsByCertId,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

const TransactionContext = createContext(null);

const STORAGE_KEY = 'certichain_transactions_v1';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Cannot load transactions:', error);
    return [];
  }
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.warn('Cannot save transactions:', error);
  }
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(() => loadTransactions());
  const [pendingTx, setPendingTx] = useState(null);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Add a new transaction to history
  const addTransaction = useCallback((tx) => {
    const now = new Date().toISOString();

    const newTx = {
      ...tx,
      id: tx.id || `tx-${Date.now()}`,
      timestamp: tx.timestamp || now,
      createdAt: tx.createdAt || now,
      status: tx.status || 'pending',
    };

    setTransactions((prev) => [newTx, ...prev].slice(0, 100));

    return newTx;
  }, []);

  // Update transaction status / data
  const updateTransaction = useCallback((id, updates) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        String(tx.id) === String(id)
          ? {
              ...tx,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : tx
      )
    );
  }, []);

  // Set pending transaction for UI display
  const setPending = useCallback((tx) => {
    setPendingTx(tx);
  }, []);

  // Clear pending transaction
  const clearPending = useCallback(() => {
    setPendingTx(null);
  }, []);

  // Clear all transaction logs
  const clearTransactions = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get transactions by type
  const getTransactionsByType = useCallback(
    (type) => {
      return transactions.filter((tx) => tx.type === type);
    },
    [transactions]
  );

  // Get transactions by certificate ID
  const getTransactionsByCertId = useCallback(
    (certId) => {
      return transactions.filter((tx) => tx.certId === certId);
    },
    [transactions]
  );

  // Get recent transactions for Dashboard Blockchain Activity
  const getRecentTransactions = useCallback(
    (limit = 5) => {
      return transactions
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.timestamp || 0) -
            new Date(a.createdAt || a.timestamp || 0)
        )
        .slice(0, limit);
    },
    [transactions]
  );

  const value = {
    transactions,
    pendingTx,
    addTransaction,
    updateTransaction,
    setPending,
    clearPending,
    clearTransactions,
    getTransactionsByType,
    getTransactionsByCertId,
    getRecentTransactions,
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
import { createContext, useContext, useState, useCallback } from 'react';

const DemoContext = createContext(null);

const DEMO_STEPS = [
  { id: 1, title: 'Connect MetaMask', description: 'Connect your MetaMask wallet to the dApp', link: '/' },
  { id: 2, title: 'Grant Issuer Role', description: 'Grant issuer role to a wallet address', link: '/issuer-management' },
  { id: 3, title: 'Issue a Certificate', description: 'Issue a new certificate on the blockchain', link: '/issue' },
  { id: 4, title: 'View Certificate Detail', description: 'View the details of the issued certificate', link: '/certificates' },
  { id: 5, title: 'Verify by Certificate ID', description: 'Verify the certificate using its ID', link: '/verify' },
  { id: 6, title: 'Verify by Original File', description: 'Upload the original file to verify hash match', link: '/verify' },
  { id: 7, title: 'Verify Modified File', description: 'Modify the file and verify to see hash mismatch', link: '/verify' },
  { id: 8, title: 'Revoke Certificate', description: 'Revoke the certificate as the issuer', link: '/certificates' },
  { id: 9, title: 'Verify Revoked Certificate', description: 'Verify the certificate and see revoked status', link: '/verify' },
  { id: 10, title: 'View on Etherscan', description: 'Open a transaction on block explorer', link: '/transactions' },
];

export function DemoProvider({ children }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentCertId, setCurrentCertId] = useState(null);

  const markStepComplete = useCallback((stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }, []);

  const markStepIncomplete = useCallback((stepId) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }, []);

  const isStepComplete = useCallback((stepId) => {
    return completedSteps.has(stepId);
  }, [completedSteps]);

  const resetDemo = useCallback(() => {
    setCompletedSteps(new Set());
    setCurrentCertId(null);
  }, []);

  const getProgress = useCallback(() => {
    return {
      completed: completedSteps.size,
      total: DEMO_STEPS.length,
      percentage: Math.round((completedSteps.size / DEMO_STEPS.length) * 100),
    };
  }, [completedSteps]);

  const value = {
    steps: DEMO_STEPS,
    completedSteps,
    currentCertId,
    setCurrentCertId,
    markStepComplete,
    markStepIncomplete,
    isStepComplete,
    resetDemo,
    getProgress,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

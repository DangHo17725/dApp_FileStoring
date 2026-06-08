import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BACKEND_URL, checkBackendHealth } from '../utils/backendApi';

const BackendContext = createContext(null);

export function BackendProvider({ children }) {
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    online: false,
    loading: false,
    error: '',
    health: null,
  });

  const refreshBackendStatus = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const health = await checkBackendHealth();
      setBackendStatus({ checked: true, online: true, loading: false, error: '', health });
      return health;
    } catch (error) {
      setBackendStatus({ checked: true, online: false, loading: false, error: error.message, health: null });
      return null;
    }
  }, []);

  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  return (
    <BackendContext.Provider value={{ backendUrl: BACKEND_URL, backendStatus, refreshBackendStatus }}>
      {children}
    </BackendContext.Provider>
  );
}

export function useBackend() {
  const context = useContext(BackendContext);
  if (!context) throw new Error('useBackend must be used within BackendProvider');
  return context;
}

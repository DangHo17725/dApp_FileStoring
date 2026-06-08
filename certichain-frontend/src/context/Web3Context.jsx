import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { CONTRACT_ABI, CONTRACT_ADDRESS, NETWORKS, CERTIFICATE_STATUS } from '../contracts';

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);

  // Get network info
  const getNetworkInfo = useCallback((id) => {
    const chainIdNum = typeof id === 'string' ? parseInt(id, 16) : id;
    if (chainIdNum === NETWORKS.hardhat.chainId) return NETWORKS.hardhat;
    if (chainIdNum === NETWORKS.sepolia.chainId) return NETWORKS.sepolia;
    return null;
  }, []);

  const networkInfo = getNetworkInfo(chainId);
  const isWrongNetwork = chainId && !networkInfo;

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // Check user roles
  const checkRoles = useCallback(async (contractInstance, userAddress) => {
    try {
      const [adminStatus, issuerStatus] = await Promise.all([
        contractInstance.isAdmin(userAddress),
        contractInstance.isIssuer(userAddress),
      ]);
      setIsAdmin(adminStatus);
      setIsIssuer(issuerStatus);
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsIssuer(false);
    }
  }, []);

  // Initialize connection
  const initConnection = useCallback(async () => {
    if (!isMetaMaskInstalled) return;

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(chain, 16));

      if (accounts.length > 0) {
        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);
        setAccount(accounts[0]);

        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);
        setContract(contractInstance);

        await checkRoles(contractInstance, accounts[0]);
      }
    } catch (error) {
      console.error('Init connection error:', error);
    }
  }, [isMetaMaskInstalled, checkRoles]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      toast.error('Please install MetaMask to use this dApp');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });

      setProvider(browserProvider);
      setChainId(parseInt(chain, 16));

      const userSigner = await browserProvider.getSigner();
      setSigner(userSigner);
      setAccount(accounts[0]);

      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);
      setContract(contractInstance);

      await checkRoles(contractInstance, accounts[0]);

      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Connect wallet error:', error);
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskInstalled, checkRoles]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setContract(null);
    setIsAdmin(false);
    setIsIssuer(false);
    toast.success('Wallet disconnected');
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (targetNetwork) => {
    if (!isMetaMaskInstalled) return;

    const network = NETWORKS[targetNetwork];
    if (!network) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: network.symbol,
                decimals: 18,
              },
              blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : null,
            }],
          });
        } catch (addError) {
          console.error('Add network error:', addError);
          toast.error('Failed to add network');
        }
      } else {
        console.error('Switch network error:', error);
        toast.error('Failed to switch network');
      }
    }
  }, [isMetaMaskInstalled]);

  // Get user role label
  const getUserRole = useCallback(() => {
    if (!account) return 'Public';
    if (isAdmin) return 'Admin';
    if (isIssuer) return 'Issuer';
    return 'Holder';
  }, [account, isAdmin, isIssuer]);

  // Handle account changes
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        if (provider) {
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
          const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
          setContract(contractInstance);
          await checkRoles(contractInstance, accounts[0]);
        }
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(parseInt(newChainId, 16));
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskInstalled, account, provider, disconnectWallet, checkRoles]);

  // Initialize on mount
  useEffect(() => {
    initConnection();
  }, [initConnection]);

  const value = {
    provider,
    signer,
    contract,
    account,
    chainId,
    networkInfo,
    isWrongNetwork,
    isConnecting,
    isAdmin,
    isIssuer,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getUserRole,
    CONTRACT_ADDRESS,
    CERTIFICATE_STATUS,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

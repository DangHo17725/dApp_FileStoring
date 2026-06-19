// Contract ABI for CertificateRegistry
export const CONTRACT_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "certId",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "documentHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "merkleRoot",
          "type": "bytes32"
        }
      ],
      "name": "CertificateIssued",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "certId",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "revokedBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "CertificateRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        }
      ],
      "name": "IssuerGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        }
      ],
      "name": "IssuerRevoked",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "admin",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "certificateExists",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllCertificateIds",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "certId",
          "type": "string"
        }
      ],
      "name": "getCertificate",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "merkleRoot",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "certId",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "certName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "certType",
              "type": "string"
            },
            {
              "internalType": "bytes32",
              "name": "documentHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "metadataHash",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "issuer",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "issuedAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "expiresAt",
              "type": "uint256"
            },
            {
              "internalType": "enum CertificateRegistry.CertificateStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "string",
              "name": "revokedReason",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "ipfsCID",
              "type": "string"
      }
          ],
          "internalType": "struct CertificateRegistry.Certificate",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        }
      ],
      "name": "getCertificatesByIssuer",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "getCertificatesByRecipient",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalCertificates",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        }
      ],
      "name": "grantIssuer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "isAdmin",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "certId",
          "type": "string"
        }
      ],
      "name": "isCertificateValid",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "isIssuer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "certId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "certName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "certType",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "documentHash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "metadataHash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "merkleRoot",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "expiresAt",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "ipfsCID",
          "type": "string"
        }
      ],
      "name": "issueCertificate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "issuers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "certId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "revokeCertificate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        }
      ],
      "name": "revokeIssuer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "certId",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "documentHash",
          "type": "bytes32"
        }
      ],
      "name": "verifyCertificate",
      "outputs": [
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "hashMatches",
          "type": "bool"
        },
        {
          "internalType": "enum CertificateRegistry.CertificateStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "issuedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "expiresAt",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "merkleRoot",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

// Network configurations
export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: null,
    symbol: 'ETH',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    symbol: 'ETH',
  },
};

// Default contract address (update after deployment)
// For local development, run: npx hardhat node && npx hardhat run scripts/deploy.js --network localhost
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Certificate status enum mapping
export const CERTIFICATE_STATUS = {
  0: 'Valid',
  1: 'Revoked',
  2: 'Expired',
};

// Certificate types
export const CERTIFICATE_TYPES = [
  'Course',
  'Degree',
  'Event',
  'Award',
  'Product',
  'Training',
];

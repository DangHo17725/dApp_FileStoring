import hardhatEthers from "@nomicfoundation/hardhat-ethers";

export default {
  plugins: [hardhatEthers],

  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
  },
};
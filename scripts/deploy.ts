import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Dang deploy...\n");

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();

  console.log(
    "CertificateRegistry tx:",
    certificateRegistry.deploymentTransaction()?.hash
  );

  await certificateRegistry.waitForDeployment();

  const registryAddr = await certificateRegistry.getAddress();
  console.log("CertificateRegistry :", registryAddr);

  const DocumentNotary = await ethers.getContractFactory("DocumentNotary");
  const documentNotary = await DocumentNotary.deploy();

  console.log(
    "DocumentNotary tx:",
    documentNotary.deploymentTransaction()?.hash
  );

  await documentNotary.waitForDeployment();

  const notaryAddr = await documentNotary.getAddress();
  console.log("DocumentNotary      :", notaryAddr);

  console.log("\nCopy cac bien sau vao certichain-frontend/.env:");
  console.log(`VITE_BACKEND_URL=http://127.0.0.1:8000`);
  console.log(`VITE_CONTRACT_ADDRESS=${registryAddr}`);
  console.log(`VITE_NOTARY_ADDRESS=${notaryAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
import hre from "hardhat";

const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");

const certificateRegistry = await CertificateRegistry.deploy();

await certificateRegistry.waitForDeployment();

const address = await certificateRegistry.getAddress();

console.log("CertificateRegistry deployed to:", address);
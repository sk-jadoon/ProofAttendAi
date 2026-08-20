import { network } from "hardhat";
import { ethers } from "ethers";

async function main() {
  const { ethers: hardhatEthers } = await network.connect();

  console.log("Deploying AttendanceNFT to Sepolia...");

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY is missing from blockchain/.env"
    );
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!rpcUrl) {
    throw new Error(
      "SEPOLIA_RPC_URL is missing from blockchain/.env"
    );
  }

  // Connect directly to Sepolia
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Create deployer wallet
  const deployer = new ethers.Wallet(
    privateKey,
    provider
  );

  console.log("Deployer address:", deployer.address);

  const balance =
    await provider.getBalance(deployer.address);

  console.log(
    "Deployer balance:",
    ethers.formatEther(balance),
    "ETH"
  );

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has no Sepolia ETH."
    );
  }

  // Get contract factory using Hardhat artifact
  const AttendanceNFT =
    await hardhatEthers.getContractFactory(
      "AttendanceNFT"
    );

  // Attach our Sepolia wallet as signer
  const factory =
    AttendanceNFT.connect(deployer);

  console.log("Sending deployment transaction...");

  const attendanceNFT =
    await factory.deploy();

  console.log(
    "Transaction hash:",
    attendanceNFT.deploymentTransaction()?.hash
  );

  await attendanceNFT.waitForDeployment();

  const contractAddress =
    await attendanceNFT.getAddress();

  console.log("");
  console.log("====================================");
  console.log("AttendanceNFT deployed successfully");
  console.log("====================================");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network: Ethereum Sepolia");
  console.log("====================================");
}

main().catch((error) => {
  console.error("");
  console.error("Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});
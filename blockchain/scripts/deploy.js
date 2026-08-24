const hre = require("hardhat");

async function main() {
  console.log("======================================");
  console.log("Deploying AttendanceNFT...");
  console.log("======================================");

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer address:");
  console.log(deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Deployer balance:");
  console.log(hre.ethers.formatEther(balance), "ETH");

  console.log("--------------------------------------");

  const AttendanceNFT = await hre.ethers.getContractFactory(
    "AttendanceNFT"
  );

  const contract = await AttendanceNFT.deploy();

  console.log("Waiting for deployment...");

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  const ownerAddress = await contract.owner();

  console.log("");
  console.log("======================================");
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("======================================");

  console.log("CONTRACT_ADDRESS=");
  console.log(contractAddress);

  console.log("OWNER_ADDRESS=");
  console.log(ownerAddress);

  console.log("DEPLOYER_ADDRESS=");
  console.log(deployer.address);

  console.log("======================================");

  if (
    ownerAddress.toLowerCase() === deployer.address.toLowerCase()
  ) {
    console.log("OWNER CHECK: PASS");
  } else {
    console.log("OWNER CHECK: FAILED");
  }

  console.log("======================================");
}

main().catch((error) => {
  console.error("");
  console.error("DEPLOYMENT FAILED");
  console.error(error);
  process.exitCode = 1;
});
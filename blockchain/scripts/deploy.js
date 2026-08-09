import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  console.log("Deploying AttendanceNFT...");

  const AttendanceNFT = await ethers.getContractFactory(
    "AttendanceNFT"
  );

  const attendanceNFT = await AttendanceNFT.deploy();

  await attendanceNFT.waitForDeployment();

  const contractAddress =
    await attendanceNFT.getAddress();

  console.log("");
  console.log("====================================");
  console.log("AttendanceNFT deployed successfully");
  console.log("====================================");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", "hardhat");
  console.log("====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const CONTRACT_ADDRESS =
  process.env.ATTENDANCE_NFT_CONTRACT_ADDRESS;

const RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL;

const PRIVATE_KEY =
  process.env.BLOCKCHAIN_PRIVATE_KEY;

if (!CONTRACT_ADDRESS) {
  throw new Error(
    "ATTENDANCE_NFT_CONTRACT_ADDRESS is missing in .env"
  );
}

if (!RPC_URL) {
  throw new Error(
    "BLOCKCHAIN_RPC_URL is missing in .env"
  );
}

if (!PRIVATE_KEY) {
  throw new Error(
    "BLOCKCHAIN_PRIVATE_KEY is missing in .env"
  );
}

const artifactPath = path.join(
  __dirname,
  "../../blockchain/artifacts/contracts/AttendanceNFT.sol/AttendanceNFT.json"
);

if (!fs.existsSync(artifactPath)) {
  throw new Error(
    `AttendanceNFT artifact not found: ${artifactPath}`
  );
}

const artifact = JSON.parse(
  fs.readFileSync(artifactPath, "utf8")
);

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wallet = new ethers.Wallet(
  PRIVATE_KEY,
  provider
);

const attendanceNFT = new ethers.Contract(
  CONTRACT_ADDRESS,
  artifact.abi,
  wallet
);

async function mintAttendanceNFT({
  studentWallet,
  sessionId,
  attendanceHash,
  metadataURI,
}) {
  if (!ethers.isAddress(studentWallet)) {
    throw new Error("Invalid student wallet address");
  }

  if (!sessionId || Number(sessionId) <= 0) {
    throw new Error("Invalid session ID");
  }

  if (!attendanceHash) {
    throw new Error("Attendance hash is required");
  }

  if (!metadataURI) {
    throw new Error("Metadata URI is required");
  }

  /*
   * Convert the backend SHA-256 hash string
   * into the bytes32 value expected by Solidity.
   */
  const hashBytes32 = ethers.keccak256(
    ethers.toUtf8Bytes(attendanceHash)
  );

  console.log("Minting Attendance NFT...");
  console.log("Student:", studentWallet);
  console.log("Session:", sessionId);
  console.log("Hash:", hashBytes32);

  const tx =
    await attendanceNFT.mintAttendanceNFT(
      studentWallet,
      Number(sessionId),
      hashBytes32,
      metadataURI
    );

  console.log("Transaction sent:", tx.hash);

  const receipt = await tx.wait();

  let tokenId = null;

  for (const log of receipt.logs) {
    try {
      const parsed =
        attendanceNFT.interface.parseLog(log);

      if (
        parsed &&
        parsed.name === "AttendanceNFTMinted"
      ) {
        tokenId =
          parsed.args.tokenId.toString();

        break;
      }
    } catch (error) {
      // Ignore logs belonging to other events
    }
  }

  if (tokenId === null) {
    throw new Error(
      "NFT token ID was not found in blockchain transaction"
    );
  }

  return {
    transactionHash: receipt.hash,
    contractAddress: CONTRACT_ADDRESS,
    tokenId,
  };
}

async function getBlockchainInfo() {
  const network = await provider.getNetwork();

  const balance =
    await provider.getBalance(wallet.address);

  return {
    walletAddress: wallet.address,
    networkName: network.name,
    chainId: network.chainId.toString(),
    balance: ethers.formatEther(balance),
    contractAddress: CONTRACT_ADDRESS,
  };
}

module.exports = {
  mintAttendanceNFT,
  getBlockchainInfo,
};
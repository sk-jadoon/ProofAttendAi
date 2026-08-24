const { ethers } = require("ethers");

const CONTRACT_ADDRESS =
  process.env.ATTENDANCE_NFT_CONTRACT_ADDRESS;

const RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL;

const PRIVATE_KEY =
  process.env.BLOCKCHAIN_PRIVATE_KEY;

if (!CONTRACT_ADDRESS) {
  throw new Error(
    "ATTENDANCE_NFT_CONTRACT_ADDRESS is missing"
  );
}

if (!RPC_URL) {
  throw new Error(
    "BLOCKCHAIN_RPC_URL is missing"
  );
}

if (!PRIVATE_KEY) {
  throw new Error(
    "BLOCKCHAIN_PRIVATE_KEY is missing"
  );
}

if (!ethers.isAddress(CONTRACT_ADDRESS)) {
  throw new Error(
    "Invalid ATTENDANCE_NFT_CONTRACT_ADDRESS"
  );
}

const provider =
  new ethers.JsonRpcProvider(RPC_URL);

const wallet =
  new ethers.Wallet(
    PRIVATE_KEY,
    provider
  );

const ATTENDANCE_NFT_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "student",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "attendanceHash",
        type: "bytes32",
      },
      {
        internalType: "string",
        name: "metadataURI",
        type: "string",
      },
    ],
    name: "mintAttendanceNFT",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "student",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "attendanceHash",
        type: "bytes32",
      },
    ],
    name: "AttendanceNFTMinted",
    type: "event",
  },

  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "bytes32",
        name: "attendanceHash",
        type: "bytes32",
      },
    ],
    name: "getTokenIdByHash",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "bytes32",
        name: "attendanceHash",
        type: "bytes32",
      },
    ],
    name: "getAttendanceByHash",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "returnedHash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "student",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "metadataURI",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "getAttendanceRecord",
    outputs: [
      {
        internalType: "bytes32",
        name: "attendanceHash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "student",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const attendanceNFT =
  new ethers.Contract(
    CONTRACT_ADDRESS,
    ATTENDANCE_NFT_ABI,
    wallet
  );

/*
|--------------------------------------------------------------------------
| Mint Attendance NFT
|--------------------------------------------------------------------------
*/
async function mintAttendanceNFT({
  studentWallet,
  sessionId,
  attendanceHash,
  metadataURI,
}) {
  if (!ethers.isAddress(studentWallet)) {
    throw new Error(
      "Invalid student wallet address"
    );
  }

  if (
    !sessionId ||
    Number(sessionId) <= 0
  ) {
    throw new Error(
      "Invalid session ID"
    );
  }

  if (!attendanceHash) {
    throw new Error(
      "Attendance hash is required"
    );
  }

  if (!metadataURI) {
    throw new Error(
      "Metadata URI is required"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Convert SHA-256 hex string into bytes32
  |--------------------------------------------------------------------------
  */

  const hashBytes32 =
    ethers.hexlify(
      ethers.toBeArray(
        "0x" + attendanceHash
      )
    );

  /*
  |--------------------------------------------------------------------------
  | Send transaction
  |--------------------------------------------------------------------------
  */

  const tx =
    await attendanceNFT.mintAttendanceNFT(
      studentWallet,
      Number(sessionId),
      hashBytes32,
      metadataURI
    );

  console.log(
    "Blockchain transaction sent:",
    tx.hash
  );

  const receipt =
    await tx.wait();

  if (!receipt) {
    throw new Error(
      "Blockchain transaction receipt not received"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Extract token ID from AttendanceNFTMinted event
  |--------------------------------------------------------------------------
  */

  let tokenId = null;

  for (const log of receipt.logs) {
    try {
      const parsed =
        attendanceNFT.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

      if (
        parsed &&
        parsed.name === "AttendanceNFTMinted"
      ) {
        tokenId =
          parsed.args.tokenId.toString();

        break;
      }
    } catch (error) {
      // Ignore unrelated logs
    }
  }

  if (tokenId === null) {
    throw new Error(
      "NFT token ID was not found in transaction logs"
    );
  }

  return {
    transactionHash: receipt.hash,
    contractAddress: CONTRACT_ADDRESS,
    tokenId,
  };
}

/*
|--------------------------------------------------------------------------
| Blockchain information
|--------------------------------------------------------------------------
*/
async function getBlockchainInfo() {
  const network =
    await provider.getNetwork();

  const balance =
    await provider.getBalance(
      wallet.address
    );

  return {
    walletAddress:
      wallet.address,

    networkName:
      network.name,

    chainId:
      network.chainId.toString(),

    balance:
      ethers.formatEther(balance),

    contractAddress:
      CONTRACT_ADDRESS,
  };
}

module.exports = {
  mintAttendanceNFT,
  getBlockchainInfo,
};
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

/*
|--------------------------------------------------------------------------
| AttendanceNFT ABI
|--------------------------------------------------------------------------
*/

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
    inputs: [
      {
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
    ],
    name: "lockAttendance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  {
    inputs: [
      {
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
    ],
    name: "isAttendanceLocked",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "sessionId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "lockedBy",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "AttendanceLocked",
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
];

/*
|--------------------------------------------------------------------------
| Provider + Wallet
|--------------------------------------------------------------------------
*/

const provider =
  new ethers.JsonRpcProvider(RPC_URL);

const wallet =
  new ethers.Wallet(
    PRIVATE_KEY,
    provider
  );

const attendanceNFT =
  new ethers.Contract(
    CONTRACT_ADDRESS,
    ATTENDANCE_NFT_ABI,
    wallet
  );

/*
|--------------------------------------------------------------------------
| MINT ATTENDANCE NFT
|--------------------------------------------------------------------------
*/

async function mintAttendanceNFT({
  studentWallet,
  sessionId,
  attendanceHash,
  metadataURI,
}) {
  try {
    if (!ethers.isAddress(studentWallet)) {
      throw new Error(
        `Invalid student wallet address: ${studentWallet}`
      );
    }

    const numericSessionId =
      Number(sessionId);

    if (
      !Number.isInteger(numericSessionId) ||
      numericSessionId <= 0
    ) {
      throw new Error(
        `Invalid session ID: ${sessionId}`
      );
    }

    if (
      typeof attendanceHash !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/.test(
        attendanceHash
      )
    ) {
      throw new Error(
        `Invalid attendance hash: ${attendanceHash}`
      );
    }

    if (
      typeof metadataURI !== "string" ||
      !metadataURI.trim()
    ) {
      throw new Error(
        "Metadata URI is required"
      );
    }

    /*
    IMPORTANT:
    Do NOT keccak this hash again.

    Controller already creates a valid
    32-byte SHA256 hash in 0x... format.
    */

    console.log(
      "Minting attendance NFT:",
      {
        studentWallet,
        sessionId: numericSessionId,
        attendanceHash,
        metadataURI,
      }
    );

    const tx =
      await attendanceNFT.mintAttendanceNFT(
        studentWallet,
        numericSessionId,
        attendanceHash,
        metadataURI
      );

    console.log(
      "NFT transaction sent:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (!receipt) {
      throw new Error(
        "Blockchain transaction receipt not found"
      );
    }

    let tokenId = null;

    for (const log of receipt.logs) {
      try {
        const parsed =
          attendanceNFT.interface.parseLog(
            log
          );

        if (
          parsed &&
          parsed.name ===
            "AttendanceNFTMinted"
        ) {
          tokenId =
            parsed.args.tokenId.toString();

          break;
        }
      } catch (error) {
        // Ignore unrelated logs
      }
    }

    /*
    Fallback:
    If event parsing fails, try to get
    token ID from the attendance hash.
    */

    if (tokenId === null) {
      try {
        const result =
          await attendanceNFT.getTokenIdByHash(
            attendanceHash
          );

        tokenId =
          result.toString();
      } catch (error) {
        throw new Error(
          "NFT was minted but token ID could not be found"
        );
      }
    }

    return {
      transactionHash:
        receipt.hash,

      contractAddress:
        CONTRACT_ADDRESS,

      tokenId,
    };
  } catch (error) {
    console.error(
      "mintAttendanceNFT error:",
      error
    );

    throw new Error(
      error?.reason ||
      error?.shortMessage ||
      error?.message ||
      "NFT mint transaction failed"
    );
  }
}

/*
|--------------------------------------------------------------------------
| LOCK ATTENDANCE ON BLOCKCHAIN
|--------------------------------------------------------------------------
*/

async function lockAttendance(
  sessionId
) {
  try {
    const numericSessionId =
      Number(sessionId);

    if (
      !Number.isInteger(numericSessionId) ||
      numericSessionId <= 0
    ) {
      throw new Error(
        "Invalid session ID"
      );
    }

    console.log(
      `Locking blockchain attendance for session ${numericSessionId}...`
    );

    const tx =
      await attendanceNFT.lockAttendance(
        numericSessionId
      );

    console.log(
      "Lock transaction sent:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (!receipt) {
      throw new Error(
        "Lock transaction receipt not found"
      );
    }

    return {
      transactionHash:
        receipt.hash,

      contractAddress:
        CONTRACT_ADDRESS,

      sessionId:
        numericSessionId,
    };
  } catch (error) {
    console.error(
      "lockAttendance error:",
      error
    );

    throw new Error(
      error?.reason ||
      error?.shortMessage ||
      error?.message ||
      "Blockchain attendance lock failed"
    );
  }
}

/*
|--------------------------------------------------------------------------
| CHECK BLOCKCHAIN LOCK
|--------------------------------------------------------------------------
*/

async function isAttendanceLocked(
  sessionId
) {
  const numericSessionId =
    Number(sessionId);

  return await attendanceNFT
    .isAttendanceLocked(
      numericSessionId
    );
}

/*
|--------------------------------------------------------------------------
| BLOCKCHAIN INFO
|--------------------------------------------------------------------------
*/

async function getBlockchainInfo() {
  const network =
    await provider.getNetwork();

  const balance =
    await provider.getBalance(
      wallet.address
    );

  const contractOwner =
    await attendanceNFT.owner();

  return {
    walletAddress:
      wallet.address,

    contractOwner,

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

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  mintAttendanceNFT,
  lockAttendance,
  isAttendanceLocked,
  getBlockchainInfo,
};
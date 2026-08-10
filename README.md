**ProofAttend AI
**
A blockchain-based attendance management system that records attendance securely and issues an NFT as verifiable proof of attendance.

**Features**
Student, teacher, and admin authentication
JWT-based authentication
Teacher attendance session creation
QR-token-based attendance marking
Prevention of duplicate attendance
Attendance session locking
SHA-256 attendance record hashing
Blockchain-based attendance verification
Attendance NFT minting for students
Student wallet address support
Transaction hash storage
NFT token ID storage
MySQL database
React frontend
Express.js backend
Solidity smart contract
Hardhat blockchain development environment

**Project Structure**
ProofAttendAi/
│
├── blockchain/
│   ├── contracts/
│   │   └── AttendanceNFT.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── AttendanceNFT.test.js
│   ├── hardhat.config.js
│   └── package.json
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── attendanceController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── attendanceRoutes.js
│   ├── services/
│   │   └── blockchainService.js
│   ├── app.js
│   ├── server.js
│   ├── .env
│   └── package.json
│
└── client/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── assets/
    ├── package.json
    └── vite.config.js
    
**Technologies Used**
Frontend
React
Vite
React Router
Axios
Ethers.js
Lucide React
Recharts
Backend
Node.js
Express.js
MySQL
JWT
bcryptjs
Axios
Ethers.js
Blockchain
Solidity
Hardhat
OpenZeppelin Contracts
Ethereum-compatible local blockchain
Prerequisites

**Install the following before running the project:**

Node.js
npm
MySQL
VS Code

Check Node.js:

node -v

Check npm:

npm -v
Installation

**Clone the project:**

git clone https://github.com/YOUR-USERNAME/ProofAttendAi.git
cd ProofAttendAi

Install frontend dependencies:

cd client
npm install

Install backend dependencies:

cd ../server
npm install

Install blockchain dependencies:

cd ../blockchain
npm install
Environment Variables

Create:

server/.env

Example:

PORT=5000

CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=proofattend

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=your_hardhat_private_key

ATTENDANCE_NFT_CONTRACT_ADDRESS=your_deployed_contract_address

Never upload .env to GitHub.

Add this to .gitignore:

node_modules/
.env
.env.local
dist/
artifacts/
cache/
Database Setup

Create the database in MySQL:

CREATE DATABASE proofattend;

Then create the required tables according to the project's database schema.

The backend uses:

DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME

to connect to MySQL.

Running the Blockchain

Open a terminal:

cd blockchain
npx hardhat node

Keep this terminal running.

Open another terminal:

cd blockchain
npx hardhat compile

Deploy the contract:

npx hardhat run scripts/deploy.js --network localhost

Copy the deployed contract address and add it to:

ATTENDANCE_NFT_CONTRACT_ADDRESS=0x...
Testing the Smart Contract

**Run:**

cd blockchain
npx hardhat test

The test suite verifies:

Contract deployment
NFT minting
Attendance record storage
Unauthorized minting rejection
Running the Backend

Open another terminal:

cd server
npm install
node server.js

The API will run on:

http://localhost:5000

Test the API:

http://localhost:5000/

Expected response:

{
  "success": true,
  "message": "ProofAttend AI API is running"
}
Running the Frontend

Open another terminal:

cd client
npm install
npm run dev

Vite will provide the frontend URL, normally:

http://localhost:5173
Application Flow
Teacher
   │
   ▼
Create Attendance Session
   │
   ▼
QR Token Generated
   │
   ▼
Student Scans QR
   │
   ▼
Attendance Stored in MySQL
   │
   ▼
Teacher Locks Session
   │
   ▼
Attendance Data Hashed
   │
   ▼
SHA-256 Hash Generated
   │
   ▼
Blockchain Transaction
   │
   ▼
Attendance NFT Minted
   │
   ▼
Transaction Hash + NFT Token ID
Stored in MySQL
API Endpoints
Authentication

**Register:
**
POST /api/auth/register

Login:

POST /api/auth/login

Current user:

GET /api/auth/me
Attendance

Create session:

POST /api/attendance/sessions

Mark attendance:

POST /api/attendance/mark

Lock session:

POST /api/attendance/sessions/:id/lock

Get session:

GET /api/attendance/sessions/:id
Security

**ProofAttend AI uses multiple layers of protection:**

Password hashing using bcrypt
JWT authentication
Role-based authorization
Duplicate attendance prevention
Session locking
SHA-256 attendance hashing
Blockchain transaction records
NFT-based proof of attendance
Smart Contract

The AttendanceNFT smart contract uses ERC-721 functionality to represent attendance as NFTs.

Each successful attendance NFT contains information associated with:

Student Wallet
Session ID
Attendance Hash
Metadata URI
NFT Token ID

The blockchain transaction provides a tamper-evident record that can be independently verified.

Local Development Commands
Blockchain
cd blockchain
npx hardhat node
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost
Backend
cd server
npm install
node server.js
Frontend
cd client
npm install
npm run dev
Deployment

The frontend can be deployed through Vercel.

For production deployment, configure the backend environment variables using the hosting provider's environment-variable settings.

Do not use local values such as:

localhost
127.0.0.1

for the production MySQL or blockchain services.

The production backend must use a publicly accessible database and blockchain RPC endpoint.

Important

Never commit these files or values to GitHub:

.env
private keys
database passwords
JWT secrets
API keys

Use environment variables instead.

License

This project is developed for educational and project demonstration purposes.

**Quick Start**

If everything is already configured:

# Terminal 1
cd blockchain
npx hardhat node
# Terminal 2
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
# Terminal 3
cd server
node server.js
# Terminal 4
cd client
npm run dev

Then open the frontend URL shown by Vite.

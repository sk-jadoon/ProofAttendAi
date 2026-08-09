import { expect } from "chai";
import { network } from "hardhat";

describe("AttendanceNFT", function () {
  async function deployContract() {
    const { ethers } = await network.connect();

    const [owner, student] = await ethers.getSigners();

    const AttendanceNFT = await ethers.getContractFactory(
      "AttendanceNFT"
    );

    const attendanceNFT = await AttendanceNFT.deploy();

    await attendanceNFT.waitForDeployment();

    return {
      attendanceNFT,
      owner,
      student,
      ethers,
    };
  }

  it("should deploy the contract correctly", async function () {
    const { attendanceNFT } = await deployContract();

    expect(await attendanceNFT.name()).to.equal(
      "ProofAttend Attendance"
    );

    expect(await attendanceNFT. symbol()).to.equal("PAT");
  });

  it("should mint an attendance NFT to the student", async function () {
    const { attendanceNFT, student, ethers } =
      await deployContract();

    const sessionId = 1;

    const attendanceHash = ethers.keccak256(
      ethers.toUtf8Bytes("attendance-session-1")
    );

    const metadataURI =
      "https://example.com/attendance/1";

    await attendanceNFT.mintAttendanceNFT(
      student.address,
      sessionId,
      attendanceHash,
      metadataURI
    );

    const tokenId = 1;

    expect(await attendanceNFT.ownerOf(tokenId)).to.equal(
      student.address
    );

    expect(await attendanceNFT.tokenURI(tokenId)).to.equal(
      metadataURI
    );
  });

  it("should store the attendance record on-chain", async function () {
    const { attendanceNFT, student, ethers } =
      await deployContract();

    const sessionId = 25;

    const attendanceHash = ethers.keccak256(
      ethers.toUtf8Bytes("locked-attendance-session-25")
    );

    const metadataURI =
      "https://example.com/attendance/25";

    await attendanceNFT.mintAttendanceNFT(
      student.address,
      sessionId,
      attendanceHash,
      metadataURI
    );

    const record =
      await attendanceNFT.getAttendanceRecord(1);

    expect(record[0]).to.equal(attendanceHash);
    expect(record[1]).to.equal(sessionId);
    expect(record[2]).to.equal(student.address);
    expect(record[3]).to.be.greaterThan(0);
  });

  it("should reject minting from a non-owner account", async function () {
    const { attendanceNFT, student, ethers } =
      await deployContract();

    const attendanceHash = ethers.keccak256(
      ethers.toUtf8Bytes("unauthorized-attendance")
    );

    await expect(
  attendanceNFT
    .connect(student)
    .mintAttendanceNFT(
      student.address,
      1,
      attendanceHash,
      "https://example.com/attendance/1"
    )
).to.be.revert(ethers);
  });
});
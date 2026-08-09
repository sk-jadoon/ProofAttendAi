// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AttendanceNFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;

    struct AttendanceRecord {
        bytes32 attendanceHash;
        uint256 sessionId;
        address student;
        uint256 timestamp;
    }

    mapping(uint256 => AttendanceRecord) private attendanceRecords;
    mapping(uint256 => string) private metadataURIs;

    event AttendanceNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed sessionId,
        address indexed student,
        bytes32 attendanceHash
    );

    constructor() ERC721("ProofAttend Attendance", "PAT") Ownable(msg.sender) {}

    function mintAttendanceNFT(
        address student,
        uint256 sessionId,
        bytes32 attendanceHash,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        require(student != address(0), "Invalid student address");
        require(sessionId > 0, "Invalid session ID");
        require(attendanceHash != bytes32(0), "Invalid attendance hash");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(student, tokenId);

        metadataURIs[tokenId] = metadataURI;

        attendanceRecords[tokenId] = AttendanceRecord({
            attendanceHash: attendanceHash,
            sessionId: sessionId,
            student: student,
            timestamp: block.timestamp
        });

        emit AttendanceNFTMinted(
            tokenId,
            sessionId,
            student,
            attendanceHash
        );

        return tokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");

        return metadataURIs[tokenId];
    }

    function getAttendanceRecord(
        uint256 tokenId
    )
        external
        view
        returns (
            bytes32 attendanceHash,
            uint256 sessionId,
            address student,
            uint256 timestamp
        )
    {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");

        AttendanceRecord memory record = attendanceRecords[tokenId];

        return (
            record.attendanceHash,
            record.sessionId,
            record.student,
            record.timestamp
        );
    }
}
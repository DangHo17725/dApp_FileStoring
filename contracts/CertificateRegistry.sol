// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificateRegistry {
    enum CertificateStatus {
        Valid,
        Revoked,
        Expired
    }

    struct Certificate {
        bytes32 merkleRoot;
        string certId;
        string certName;
        string certType;
        bytes32 documentHash;
        bytes32 metadataHash;
        address issuer;
        address recipient;
        uint256 issuedAt;
        uint256 expiresAt;
        CertificateStatus status;
        string revokedReason;
        string ipfsCID;
    }

    address public admin;

    mapping(address => bool) public issuers;
    mapping(string => Certificate) private certificates;
    mapping(string => bool) public certificateExists;

    string[] private allCertificateIds;

    mapping(address => string[]) private certificatesByRecipient;
    mapping(address => string[]) private certificatesByIssuer;

    event IssuerGranted(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    event CertificateIssued(
        string certId,
        address indexed issuer,
        address indexed recipient,
        bytes32 documentHash,
        bytes32 merkleRoot
    );

    event CertificateRevoked(
        string certId,
        address indexed revokedBy,
        string reason
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "Only issuer can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
        issuers[msg.sender] = true;
    }

    function grantIssuer(address issuer) external onlyAdmin {
        require(issuer != address(0), "Invalid issuer address");

        issuers[issuer] = true;

        emit IssuerGranted(issuer);
    }

    function revokeIssuer(address issuer) external onlyAdmin {
        require(issuer != address(0), "Invalid issuer address");

        issuers[issuer] = false;

        emit IssuerRevoked(issuer);
    }

    function isAdmin(address account) external view returns (bool) {
        return account == admin;
    }

    function isIssuer(address account) external view returns (bool) {
        return issuers[account];
    }

    function issueCertificate(
        string memory certId,
        string memory certName,
        string memory certType,
        bytes32 documentHash,
        bytes32 metadataHash,
        bytes32 merkleRoot,
        address recipient,
        uint256 expiresAt,
        string memory ipfsCID
    ) external onlyIssuer {
        require(bytes(certId).length > 0, "Certificate ID is required");
        require(bytes(certName).length > 0, "Certificate name is required");
        require(documentHash != bytes32(0), "Document hash is required");
        require(recipient != address(0), "Invalid recipient address");
        require(!certificateExists[certId], "Certificate already exists");
        require(merkleRoot != bytes32(0), "Merkle root is required");

        certificates[certId] = Certificate({
            certId: certId,
            certName: certName,
            certType: certType,
            documentHash: documentHash,
            metadataHash: metadataHash,
            issuer: msg.sender,
            recipient: recipient,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            status: CertificateStatus.Valid,
            revokedReason: "",
            merkleRoot: merkleRoot,
            ipfsCID: ipfsCID
        });

        certificateExists[certId] = true;
        allCertificateIds.push(certId);
        certificatesByRecipient[recipient].push(certId);
        certificatesByIssuer[msg.sender].push(certId);

        emit CertificateIssued(certId, msg.sender, recipient, documentHash, merkleRoot);
    }

    function revokeCertificate(
        string memory certId,
        string memory reason
    ) external {
        require(certificateExists[certId], "Certificate does not exist");

        Certificate storage cert = certificates[certId];

        require(
            msg.sender == admin || msg.sender == cert.issuer,
            "Not authorized to revoke"
        );

        require(
            cert.status != CertificateStatus.Revoked,
            "Certificate already revoked"
        );

        cert.status = CertificateStatus.Revoked;
        cert.revokedReason = reason;

        emit CertificateRevoked(certId, msg.sender, reason);
    }

    function getCertificate(
        string memory certId
    ) external view returns (Certificate memory) {
        require(certificateExists[certId], "Certificate does not exist");

        Certificate memory cert = certificates[certId];

        if (
            cert.status == CertificateStatus.Valid &&
            cert.expiresAt > 0 &&
            block.timestamp > cert.expiresAt
        ) {
            cert.status = CertificateStatus.Expired;
        }

        return cert;
    }

    function verifyCertificate(
        string memory certId,
        bytes32 documentHash
    )
        external
        view
        returns (
            bool exists,
            bool hashMatches,
            CertificateStatus status,
            address issuer,
            address recipient,
            uint256 issuedAt,
            uint256 expiresAt,
            bytes32 merkleRoot
        )
    {
        if (!certificateExists[certId]) {
            return (
                false,
                false,
                CertificateStatus.Revoked,
                address(0),
                address(0),
                0,
                0,
                bytes32(0)
            );
        }

        Certificate memory cert = certificates[certId];

        CertificateStatus effectiveStatus = cert.status;

        if (
            cert.status == CertificateStatus.Valid &&
            cert.expiresAt > 0 &&
            block.timestamp > cert.expiresAt
        ) {
            effectiveStatus = CertificateStatus.Expired;
        }

        bool matches = documentHash == bytes32(0) || cert.documentHash == documentHash;

        return (
            true,
            matches,
            effectiveStatus,
            cert.issuer,
            cert.recipient,
            cert.issuedAt,
            cert.expiresAt,
            cert.merkleRoot
        );
    }

    function isCertificateValid(
        string memory certId
    ) external view returns (bool) {
        if (!certificateExists[certId]) {
            return false;
        }

        Certificate memory cert = certificates[certId];

        if (cert.status != CertificateStatus.Valid) {
            return false;
        }

        if (cert.expiresAt > 0 && block.timestamp > cert.expiresAt) {
            return false;
        }

        return true;
    }

    function getAllCertificateIds() external view returns (string[] memory) {
        return allCertificateIds;
    }

    function getCertificatesByRecipient(
        address recipient
    ) external view returns (string[] memory) {
        return certificatesByRecipient[recipient];
    }

    function getCertificatesByIssuer(
        address issuer
    ) external view returns (string[] memory) {
        return certificatesByIssuer[issuer];
    }

    function getTotalCertificates() external view returns (uint256) {
        return allCertificateIds.length;
    }

    //Hỗ trợ Backend lấy IPFS CID để cấp quyền truy cập file
    function getCertificateIPFS(string memory certId) external view returns (string memory) {
        require(certificateExists[certId], "Certificate does not exist");
        return certificates[certId].ipfsCID;
    }
}
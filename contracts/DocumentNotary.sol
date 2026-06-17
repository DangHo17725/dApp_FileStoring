// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ================================================================
// DocumentNotary.sol
// Hệ thống công chứng tài liệu phi tập trung
//
// Thiết kế:
//   - Lưu mapping(merkleRoot => BatchRecord) — KHÔNG lưu từng docHash
//   - 1000 file trong 1 batch → chỉ tốn gas của 1 transaction
//   - Verify file bằng Merkle proof (không cần tải cả batch)
//   - 1 file: proof = [] → root chính là leafHash (tự xử lý)
// ================================================================

contract DocumentNotary {

    struct BatchRecord {
        address submitter;    // địa chỉ ví người công chứng
        uint256 timestamp;    // thời điểm công chứng (Unix epoch)
        uint256 fileCount;    // số file trong batch
        string  description;  // mô tả batch
    }

    // Key = merkleRoot (không phải docHash)
    mapping(bytes32 => BatchRecord) public batches;
    uint256 public batchCount;

    event BatchNotarized(
        bytes32 indexed merkleRoot,
        address indexed submitter,
        uint256         fileCount,
        uint256         timestamp
    );

    // PROOF OF EXISTENCE
    // Ghi merkleRoot của một batch lên chain
    // Bất kể batch có 1 hay 1000 file, chỉ gọi 1 lần duy nhất
    function notarize(
        bytes32         merkleRoot,
        uint256         fileCount,
        string calldata description
    ) external returns (bytes32) {
        require(batches[merkleRoot].timestamp == 0, "Batch nay da duoc cong chung");
        require(fileCount > 0, "fileCount phai lon hon 0");

        batches[merkleRoot] = BatchRecord({
            submitter:   msg.sender,
            timestamp:   block.timestamp,
            fileCount:   fileCount,
            description: description
        });
        batchCount++;

        emit BatchNotarized(merkleRoot, msg.sender, fileCount, block.timestamp);
        return merkleRoot;
    }

    // ════════════════════════════════════════════════════════════
    // PROOF OF INTEGRITY
    // Xác minh file có thuộc batch đã công chứng không
    //
    // leafHash : hash_file_hex() từ Rust = sha256(0x00 || file_content)
    // proof    : generate_proof() từ Rust = [(sibling_hash, is_left)]
    // isLeft   : mảng bool tương ứng proof
    // root     : merkleRoot đã lưu on-chain
    //
    // 1 file: proof=[], isLeft=[] → return leafHash == root
    // ════════════════════════════════════════════════════════════
    function verifyDocument(
        bytes32            leafHash,
        bytes32[] calldata proof,
        bool[]    calldata isLeft,
        bytes32            root
    ) public pure returns (bool) {
        require(proof.length == isLeft.length, "proof va isLeft phai cung do dai");

        // Trường hợp 1 file
        if (proof.length == 0) {
            return leafHash == root;
        }

        // Nhiều file: tính lại root từ proof
        // Dùng sha256 + prefix 0x01 để khớp với Rust Node::hash_pair()
        bytes32 current = leafHash;
        for (uint256 i = 0; i < proof.length; i++) {
            if (isLeft[i]) {
                current = sha256(abi.encodePacked(bytes1(0x01), proof[i], current));
            } else {
                current = sha256(abi.encodePacked(bytes1(0x01), current, proof[i]));
            }
        }
        return current == root;
    }

    // Verify + kiểm tra batch tồn tại trên chain
    // proofValid=true  → file nguyên vẹn
    // batchOnChain=true → batch đã công chứng
    function verifyAndCheck(
        bytes32            leafHash,
        bytes32[] calldata proof,
        bool[]    calldata isLeft,
        bytes32            root
    ) external view returns (bool proofValid, bool batchOnChain) {
        proofValid   = verifyDocument(leafHash, proof, isLeft, root);
        batchOnChain = batches[root].timestamp != 0;
    }

    function getBatch(bytes32 root) external view returns (
        address submitter,
        uint256 timestamp,
        uint256 fileCount,
        string  memory description
    ) {
        BatchRecord memory r = batches[root];
        require(r.timestamp != 0, "Khong tim thay batch");
        return (r.submitter, r.timestamp, r.fileCount, r.description);
    }

    function batchExists(bytes32 root) external view returns (bool) {
        return batches[root].timestamp != 0;
    }
}

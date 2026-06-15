// main.rs — Demo Proof of Existence + Proof of Integrity

use merkle_rs::{
    load_files_from_dir, MerkleTree,
    BatchRecord, FileRecord,
    hash_file, to_hex, Node,
};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dir      = "../sample_docs";
    let batch_id = "batch_001";

    let file_leaves = load_files_from_dir(dir)?;
    if file_leaves.is_empty() {
        println!("Thư mục '{}' không có file nào.", dir);
        return Ok(());
    }

    let mtree     = MerkleTree::from_file_leaves(file_leaves.clone());
    let root_hex  = mtree.get_root_hash_hex();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH).unwrap()
        .as_secs();

    // ── In danh sách file đầu vào ─────────────────────────────────
    println!("=== INPUT FILES ({} files) ===", file_leaves.len());
    for leaf in &file_leaves {
        println!("  {} → {}", leaf.file_name, to_hex(&leaf.file_hash));
    }

    // ════════════════════════════════════════════════════════════════
    // PROOF OF EXISTENCE
    // Bằng chứng: batch này tồn tại tại thời điểm timestamp
    // Khi merkle_root + timestamp được ghi lên smart contract,
    // không ai có thể phủ nhận batch này tồn tại trước thời điểm đó
    // ════════════════════════════════════════════════════════════════
    println!("\n╔══════════════════════════════════════╗");
    println!("║       PROOF OF EXISTENCE             ║");
    println!("╚══════════════════════════════════════╝");
    println!("  Batch ID    : {}", batch_id);
    println!("  File count  : {}", file_leaves.len());
    println!("  Merkle root : {}", root_hex);
    println!("  Timestamp   : {} (Unix epoch)", timestamp);
    println!();
    println!("  → Ghi merkle_root + timestamp lên blockchain");
    println!("    = bằng chứng {} file tồn tại tại thời điểm {}", file_leaves.len(), timestamp);

    // Xuất JSON record ra file
    let record = BatchRecord {
        batch_id:    batch_id.to_string(),
        timestamp:   timestamp.to_string(),
        merkle_root: root_hex.clone(),
        files: file_leaves.iter().map(|l| FileRecord {
            file_name: l.file_name.clone(),
            file_hash: to_hex(&l.file_hash),
        }).collect(),
    };
    fs::create_dir_all("../output")?;
    let json = serde_json::to_string_pretty(&record)?;
    let mut f = File::create("../output/batch_record.json")?;
    f.write_all(json.as_bytes())?;
    println!("\n  Đã xuất record: output/batch_record.json");

    // ════════════════════════════════════════════════════════════════
    // PROOF OF INTEGRITY
    // Bằng chứng: file chưa bị sửa kể từ khi công chứng
    // Dùng Merkle proof để verify từng file mà không cần tải cả batch
    // ════════════════════════════════════════════════════════════════
    println!("\n╔══════════════════════════════════════╗");
    println!("║       PROOF OF INTEGRITY             ║");
    println!("╚══════════════════════════════════════╝");

    let target_file = &file_leaves[0].file_name; // lấy file đầu tiên làm ví dụ
    println!("  Kiểm tra file: {}\n", target_file);

    match mtree.generate_proof(target_file) {
        Some(proof) => {
            println!("  Merkle proof ({} bước):", proof.len());
            for (i, step) in proof.iter().enumerate() {
                println!("    Bước {}: sibling={}, is_left={}",
                    i + 1, &to_hex(&step.sibling_hash)[..16], step.sibling_is_left);
            }

            // Case 1: file nguyên vẹn
            let real_hash = hash_file(&Path::new(dir).join(target_file))?;
            let valid = MerkleTree::verify_proof_from_hash(
                real_hash, &proof, &mtree.get_root_raw()
            );
            println!("\n  [File gốc]    → Verify: {} ✓", valid);

            // Case 2: file bị sửa
            let fake_hash = Node::hash_bytes(b"noi dung bi gia mao");
            let tampered  = MerkleTree::verify_proof_from_hash(
                fake_hash, &proof, &mtree.get_root_raw()
            );
            println!("  [File sửa]    → Verify: {} ✗", tampered);
            println!();
            println!("  → Proof of Integrity: file chưa bị thay đổi kể từ khi công chứng");
        }
        None => println!("  Không tìm thấy '{}' trong cây", target_file),
    }

    // ── Cây Merkle (tùy chọn, bỏ comment nếu cần xem) ─────────────
    // println!("\n=== MERKLE TREE ===");
    // mtree.print_tree();

    Ok(())
}
// ================================================================
// main.rs — CHỈ chứa hàm main()
// Toàn bộ logic Merkle tree nằm trong lib.rs
// ================================================================

use merkle_rs::{
    load_files_from_dir, MerkleTree,
    BatchRecord, FileRecord,
    hash_file, to_hex, Node,
};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dir = "../sample_docs";

    let file_leaves = load_files_from_dir(dir)?;

    if file_leaves.is_empty() {
        println!("Thư mục '{}' không có file nào.", dir);
        return Ok(());
    }

    let mtree = MerkleTree::from_file_leaves(file_leaves.clone());

    // ── Xuất JSON ─────────────────────────────────────────────────
    let batch_record = BatchRecord {
        batch_id:    "batch_001".to_string(),
        timestamp:   format!("{:?}", std::time::SystemTime::now()),
        merkle_root: mtree.get_root_hash_hex(),
        files: file_leaves.iter()
            .map(|leaf| FileRecord {
                file_name: leaf.file_name.clone(),
                file_hash: to_hex(&leaf.file_hash),
            })
            .collect(),
    };

    fs::create_dir_all("../output")?;
    let json_data = serde_json::to_string_pretty(&batch_record)?;
    let mut file  = File::create("../output/batch_record.json")?;
    file.write_all(json_data.as_bytes())?;
    println!("Đã xuất: output/batch_record.json\n");

    // ── In kết quả ────────────────────────────────────────────────
    println!("=== INPUT FILES ===");
    for leaf in &file_leaves {
        println!("  {} -> {}", leaf.file_name, to_hex(&leaf.file_hash));
    }

    println!("\n=== MERKLE ROOT ===");
    println!("  {}\n", mtree.get_root_hash_hex());

    println!("=== TREE ===");
    mtree.print_tree();

    // ── Test Merkle proof ─────────────────────────────────────────
    let target_file = "3368926.3369709.pdf";
    println!("=== GENERATE PROOF FOR '{}' ===", target_file);

    match mtree.generate_proof(target_file) {
        Some(proof) => {
            for (i, step) in proof.iter().enumerate() {
                println!(
                    "  Step {}: sibling = {}, is_left = {}",
                    i + 1,
                    to_hex(&step.sibling_hash),
                    step.sibling_is_left
                );
            }

            let target_hash = hash_file(&Path::new(dir).join(target_file))?;
            let is_valid    = MerkleTree::verify_proof_from_hash(
                target_hash, &proof, &mtree.get_root_raw(),
            );
            println!("\n  Verify (thật) : {}", is_valid);

            let fake_hash   = Node::hash_bytes(b"fake file content");
            let fake_result = MerkleTree::verify_proof_from_hash(
                fake_hash, &proof, &mtree.get_root_raw(),
            );
            println!("  Verify (giả)  : {}", fake_result);
        }
        None => println!("  Không tìm thấy '{}' trong cây", target_file),
    }

    Ok(())
}
use sha2::{Digest, Sha256};
use std::env;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::WalkDir;

fn hash_file(path: &Path) -> std::io::Result<([u8; 32], u64)> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    let mut total_bytes = 0u64;

    loop {
        let n = reader.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
        total_bytes += n as u64;
    }

    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);

    Ok((hash, total_bytes))
}

fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(left);
    hasher.update(right);

    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);

    hash
}

fn merkle_root(leaves: &[[u8; 32]]) -> Option<[u8; 32]> {
    if leaves.is_empty() {
        return None;
    }

    let mut level = leaves.to_vec();

    while level.len() > 1 {
        let mut next_level = Vec::new();

        for pair in level.chunks(2) {
            let left = &pair[0];
            let right = if pair.len() == 2 { &pair[1] } else { &pair[0] };
            next_level.push(hash_pair(left, right));
        }

        level = next_level;
    }

    Some(level[0])
}

fn collect_files(folder: &str) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = WalkDir::new(folder)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .map(|entry| entry.path().to_path_buf())
        .collect();

    files.sort();
    files
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: cargo run --release --bin bench_merkle -- <folder_path>");
        return;
    }

    let folder = &args[1];
    let files = collect_files(folder);

    if files.is_empty() {
        eprintln!("No files found in folder: {}", folder);
        return;
    }

    let hash_start = Instant::now();

    let mut hashes = Vec::new();
    let mut total_bytes = 0u64;

    for file in &files {
        match hash_file(file) {
            Ok((hash, size)) => {
                hashes.push(hash);
                total_bytes += size;
            }
            Err(err) => {
                eprintln!("Failed to hash file {:?}: {}", file, err);
            }
        }
    }

    let hash_ms = hash_start.elapsed().as_secs_f64() * 1000.0;

    let merkle_start = Instant::now();
    let root = merkle_root(&hashes).expect("Cannot create Merkle Root");
    let merkle_ms = merkle_start.elapsed().as_secs_f64() * 1000.0;

    let total_ms = hash_ms + merkle_ms;
    let total_mb = total_bytes as f64 / 1024.0 / 1024.0;

    println!(
        "{},{:.2},{:.3},{:.3},{:.3},{}",
        files.len(),
        total_mb,
        hash_ms,
        merkle_ms,
        total_ms,
        hex::encode(root)
    );
}
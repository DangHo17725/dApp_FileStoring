// ================================================================
// lib.rs — Toàn bộ logic Merkle tree + PyO3 bindings (tùy chọn)
// ================================================================
// cargo run                              → dùng file này như rlib
// maturin develop --features extension-module → build .pyd cho Python
// ================================================================

use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use serde::Serialize;

// ── Kiểu dữ liệu cơ bản ─────────────────────────────────────────

pub type Hash = [u8; 32];

pub fn to_hex(hash: &Hash) -> String {
    hash.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Chuyển chuỗi hex 64 ký tự về [u8; 32]
pub fn hex_to_hash(hex: &str) -> Result<Hash, String> {
    if hex.len() != 64 {
        return Err(format!(
            "Hex string phải có 64 ký tự, nhận được: {}",
            hex.len()
        ));
    }
    let mut hash = [0u8; 32];
    for i in 0..32 {
        hash[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16)
            .map_err(|e| format!("Ký tự hex không hợp lệ tại vị trí {}: {}", i, e))?;
    }
    Ok(hash)
}

// ── Node ─────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct Node {
    pub left:      Option<Box<Node>>,
    pub right:     Option<Box<Node>>,
    pub value:     Hash,
    pub content:   String,
    pub is_copied: bool,
}

impl Node {
    pub(crate) fn new(
        left:      Option<Box<Node>>,
        right:     Option<Box<Node>>,
        value:     Hash,
        content:   String,
        is_copied: bool,
    ) -> Self {
        Self { left, right, value, content, is_copied }
    }

    /// Hash một leaf (prefix 0x00 — tránh second-preimage attack)
    pub fn hash_bytes(data: &[u8]) -> Hash {
        let mut h = Sha256::new();
        h.update(&[0x00]);
        h.update(data);
        h.finalize().into()
    }

    /// Hash hai node con (prefix 0x01)
    fn hash_pair(left: &Hash, right: &Hash) -> Hash {
        let mut h = Sha256::new();
        h.update(&[0x01]);
        h.update(left);
        h.update(right);
        h.finalize().into()
    }

    fn copy_node(&self) -> Node {
        Node {
            left:      self.left.clone(),
            right:     self.right.clone(),
            value:     self.value,
            content:   self.content.clone(),
            is_copied: true,
        }
    }
}

// ── ProofStep ────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct ProofStep {
    pub sibling_hash:    Hash,
    pub sibling_is_left: bool, // true = sibling ở trái, false = sibling ở phải
}

// ── FileLeaf ─────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct FileLeaf {
    pub file_name: String,
    pub file_hash: Hash,
}

// ── MerkleTree ───────────────────────────────────────────────────

#[derive(Debug)]
pub struct MerkleTree {
    pub root: Node,
}

impl MerkleTree {
    pub fn from_file_leaves(file_leaves: Vec<FileLeaf>) -> Self {
        let root = Self::build_tree_from_file_leaves(file_leaves);
        Self { root }
    }

    fn build_tree_from_file_leaves(file_leaves: Vec<FileLeaf>) -> Node {
        if file_leaves.is_empty() {
            panic!("Không có file nào để xây cây Merkle");
        }
        let mut leaves: Vec<Node> = file_leaves
            .into_iter()
            .map(|f| Node::new(None, None, f.file_hash, f.file_name, false))
            .collect();
        if leaves.len() % 2 == 1 && leaves.len() > 1 {
            let last = leaves.last().unwrap().copy_node();
            leaves.push(last);
        }
        Self::build_tree_rec(leaves)
    }

    fn build_tree_rec(mut nodes: Vec<Node>) -> Node {
        if nodes.len() == 1 {
            return nodes.remove(0);
        }
        if nodes.len() % 2 == 1 {
            let last = nodes.last().unwrap().copy_node();
            nodes.push(last);
        }
        if nodes.len() == 2 {
            let mut iter = nodes.into_iter();
            let left  = iter.next().unwrap();
            let right = iter.next().unwrap();
            let value   = Node::hash_pair(&left.value, &right.value);
            let content = format!("{} + {}", left.content, right.content);
            return Node::new(Some(Box::new(left)), Some(Box::new(right)), value, content, false);
        }
        let half        = nodes.len() / 2;
        let right_nodes = nodes.split_off(half);
        let left  = Self::build_tree_rec(nodes);
        let right = Self::build_tree_rec(right_nodes);
        let value   = Node::hash_pair(&left.value, &right.value);
        let content = format!("{} + {}", left.content, right.content);
        Node::new(Some(Box::new(left)), Some(Box::new(right)), value, content, false)
    }

    pub fn get_root_hash_hex(&self) -> String { to_hex(&self.root.value) }
    pub fn get_root_raw(&self)      -> Hash   { self.root.value }

    pub fn print_tree(&self) { Self::print_tree_rec(&self.root); }

    fn print_tree_rec(node: &Node) {
        if let Some(left) = &node.left {
            println!("Left : {}", to_hex(&left.value));
            if let Some(right) = &node.right {
                println!("Right: {}", to_hex(&right.value));
            }
        } else {
            println!("Leaf");
        }
        if node.is_copied { println!("(Padding node)"); }
        println!("Value  : {}", to_hex(&node.value));
        println!("Content: {}", node.content);
        println!();
        if let Some(left)  = &node.left  { Self::print_tree_rec(left);  }
        if let Some(right) = &node.right { Self::print_tree_rec(right); }
    }

    /// Sinh Merkle proof cho file target_file_name
    pub fn generate_proof(&self, target_file_name: &str) -> Option<Vec<ProofStep>> {
        let mut proof = Vec::new();
        if Self::generate_proof_rec(&self.root, target_file_name, &mut proof) {
            Some(proof)
        } else {
            None
        }
    }

    fn generate_proof_rec(node: &Node, target: &str, proof: &mut Vec<ProofStep>) -> bool {
        if node.left.is_none() && node.right.is_none() {
            return node.content == target;
        }
        let left  = node.left.as_ref().unwrap();
        let right = node.right.as_ref().unwrap();
        if Self::generate_proof_rec(left, target, proof) {
            proof.push(ProofStep { sibling_hash: right.value, sibling_is_left: false });
            return true;
        }
        if Self::generate_proof_rec(right, target, proof) {
            proof.push(ProofStep { sibling_hash: left.value, sibling_is_left: true });
            return true;
        }
        false
    }

    /// Xác minh proof: tính lại root từ leaf_hash + proof, so sánh với expected_root
    pub fn verify_proof_from_hash(
        leaf_hash:     Hash,
        proof:         &[ProofStep],
        expected_root: &Hash,
    ) -> bool {
        let mut current = leaf_hash;
        for step in proof {
            current = if step.sibling_is_left {
                Node::hash_pair(&step.sibling_hash, &current)
            } else {
                Node::hash_pair(&current, &step.sibling_hash)
            };
        }
        &current == expected_root
    }
}

// ── Helper functions ─────────────────────────────────────────────

/// Hash nội dung một file
pub fn hash_file(path: &Path) -> Result<Hash, Box<dyn std::error::Error>> {
    let data = fs::read(path)?;
    Ok(Node::hash_bytes(&data))
}

/// Đọc tất cả file trong thư mục dir và trả về danh sách FileLeaf (đã sort)
pub fn load_files_from_dir(dir: &str) -> Result<Vec<FileLeaf>, Box<dyn std::error::Error>> {
    let mut paths: Vec<PathBuf> = Vec::new();
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_file() { paths.push(path); }
    }
    paths.sort(); // sort để root ổn định giữa các lần chạy
    let mut leaves = Vec::new();
    for path in paths {
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        let hash = hash_file(&path)?;
        leaves.push(FileLeaf { file_name: name, file_hash: hash });
    }
    Ok(leaves)
}

// ── JSON structs ─────────────────────────────────────────────────

#[derive(Serialize)]
pub struct FileRecord {
    pub file_name: String,
    pub file_hash: String,
}

#[derive(Serialize)]
pub struct BatchRecord {
    pub batch_id:    String,
    pub timestamp:   String,
    pub merkle_root: String,
    pub files:       Vec<FileRecord>,
}

// ================================================================
// PyO3 Bindings
// Chỉ compile khi chạy: maturin develop --features extension-module
// Không ảnh hưởng gì đến `cargo run`
// ================================================================

#[cfg(feature = "extension-module")]
use pyo3::prelude::*;

/// Tính Merkle root cho tất cả file trong thư mục `dir`
/// Trả về hex string 64 ký tự
#[cfg(feature = "extension-module")]
#[pyfunction]
pub fn compute_merkle_root(dir: String) -> PyResult<String> {
    let leaves = load_files_from_dir(&dir)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    if leaves.is_empty() {
        return Err(pyo3::exceptions::PyValueError::new_err("Thư mục rỗng"));
    }
    Ok(MerkleTree::from_file_leaves(leaves).get_root_hash_hex())
}

/// Hash một file, trả về hex string
/// Python gọi: leaf_hash = merkle_rs.hash_file_hex("path/to/file.pdf")
#[cfg(feature = "extension-module")]
#[pyfunction]
pub fn hash_file_hex(path: String) -> PyResult<String> {
    let h = hash_file(Path::new(&path))
        .map_err(|e| pyo3::exceptions::PyIOError::new_err(e.to_string()))?;
    Ok(to_hex(&h))
}

/// Sinh Merkle proof cho file `target_file` trong thư mục `dir`
/// Trả về list[(sibling_hash_hex, sibling_is_left)]
#[cfg(feature = "extension-module")]
#[pyfunction]
pub fn generate_proof(dir: String, target_file: String) -> PyResult<Vec<(String, bool)>> {
    let leaves = load_files_from_dir(&dir)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    let tree = MerkleTree::from_file_leaves(leaves);
    match tree.generate_proof(&target_file) {
        Some(proof) => Ok(proof.iter()
            .map(|s| (to_hex(&s.sibling_hash), s.sibling_is_left))
            .collect()),
        None => Err(pyo3::exceptions::PyValueError::new_err(
            format!("File '{}' không có trong cây Merkle", target_file)
        )),
    }
}

/// Xác minh Merkle proof
/// leaf_hash_hex : kết quả từ hash_file_hex()
/// proof         : kết quả từ generate_proof()
/// root_hex      : merkle_root đã lưu trên blockchain
#[cfg(feature = "extension-module")]
#[pyfunction]
pub fn verify_proof(
    leaf_hash_hex: String,
    proof:         Vec<(String, bool)>,
    root_hex:      String,
) -> PyResult<bool> {
    let leaf = hex_to_hash(&leaf_hash_hex)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;
    let steps: Vec<ProofStep> = proof.iter()
        .map(|(h, is_left)| {
            hex_to_hash(h).map(|sh| ProofStep {
                sibling_hash:    sh,
                sibling_is_left: *is_left,
            })
        })
        .collect::<Result<_, _>>()
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;
    let root = hex_to_hash(&root_hex)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))?;
    Ok(MerkleTree::verify_proof_from_hash(leaf, &steps, &root))
}

/// Python module — sau khi maturin develop: import merkle_rs
#[cfg(feature = "extension-module")]
#[pymodule]
fn merkle_rs(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(compute_merkle_root, m)?)?;
    m.add_function(wrap_pyfunction!(hash_file_hex,       m)?)?;
    m.add_function(wrap_pyfunction!(generate_proof,      m)?)?;
    m.add_function(wrap_pyfunction!(verify_proof,        m)?)?;
    Ok(())
}

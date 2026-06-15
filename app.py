import merkle_rs
import os
from python_blockchain.main import Blockchain   

DOCS = r"D:\Blockchain\sample_docs"
file_count = len([f for f in os.scandir(DOCS) if f.is_file()])
bc = Blockchain(difficulty=4)

root = merkle_rs.compute_merkle_root(DOCS)
bc.add_block({
    "merkle_root": root,
    "batch_id":    "batch_001",
    "file_count": file_count,
})

bc.print_chain()
print("Chain valid:", bc.is_valid())

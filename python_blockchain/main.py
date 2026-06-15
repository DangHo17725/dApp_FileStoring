# blockchain.py — Block không có PoW
# Phù hợp cho hệ thống document notarization:
# tính bất biến thực sự đến từ Ethereum smart contract, không phải mining

import hashlib
import datetime
import json


class Block:
    def __init__(self, index: int, data: dict, previous_hash: str):
        self.index         = int(index)
        self.timestamp     = str(datetime.datetime.now())
        self.data          = data
        self.previous_hash = str(previous_hash)
        self.hash          = self.calculate_hash()

    def calculate_hash(self) -> str:
        block_string = json.dumps({
            "index":         self.index,
            "timestamp":     self.timestamp,
            "data":          self.data,
            "previous_hash": self.previous_hash,
        }, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(block_string.encode()).hexdigest()


class Blockchain:
    def __init__(self):
        self.chain = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(0, {"message": "Genesis Block"}, "0")
        self.chain.append(genesis)

    def get_last_block(self) -> Block:
        return self.chain[-1]

    def add_block(self, data: dict):
        last  = self.get_last_block()
        block = Block(
            index         = last.index + 1,
            data          = data,
            previous_hash = last.hash,
        )
        self.chain.append(block)
        print(f"  [Block {block.index}] hash={block.hash[:20]}...")

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.hash != curr.calculate_hash():
                print(f"  [INVALID] Block {i}: hash không khớp")
                return False
            if curr.previous_hash != prev.hash:
                print(f"  [INVALID] Block {i}: liên kết bị gãy")
                return False
        return True

    def print_chain(self):
        for block in self.chain:
            print(f"===== Block {block.index} =====")
            print(f"Timestamp     : {block.timestamp}")
            print(f"Data          : {json.dumps(block.data, ensure_ascii=False, indent=2)}")
            print(f"Hash          : {block.hash}")
            print(f"Previous Hash : {block.previous_hash}\n")
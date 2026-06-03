import hashlib
import datetime
import json
import time


class Block:
    def __init__(self, index: int, data: dict, previous_hash: str, difficulty: int = 4):
        self.index        = int(index)
        self.timestamp    = str(datetime.datetime.now())
        self.data         = data
        self.previous_hash = str(previous_hash)
        self.difficulty   = difficulty
        self.nonce        = 0
        # Gọi mine() thay vì calculate_hash() — hash trả về sau khi đào xong
        self.hash         = self._mine()

    # ------------------------------------------------------------------ #
    #  Tính hash từ toàn bộ nội dung block (bao gồm nonce)               #
    # ------------------------------------------------------------------ #
    def calculate_hash(self) -> str:
        block_string = json.dumps({
            "index":         self.index,
            "timestamp":     self.timestamp,
            "data":          self.data,
            "previous_hash": self.previous_hash,
            "nonce":         self.nonce,          # <-- thêm mới
        }, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(block_string.encode()).hexdigest()

    # ------------------------------------------------------------------ #
    #  PoW: tăng nonce đến khi hash bắt đầu bằng đủ số "0"              #
    # ------------------------------------------------------------------ #
    def _mine(self) -> str:
        target = "0" * self.difficulty
        start  = time.time()
        while True:
            h = self.calculate_hash()
            if h.startswith(target):
                elapsed = time.time() - start
                print(
                    f"  [Mined] Block {self.index} | "
                    f"nonce={self.nonce:,} | "
                    f"{elapsed:.2f}s | "
                    f"hash={h[:20]}..."
                )
                return h
            self.nonce += 1


# ====================================================================== #
class Blockchain:
    def __init__(self, difficulty: int = 4):
        self.chain      = []
        self.difficulty = difficulty
        self._create_genesis_block()

    # ------------------------------------------------------------------ #
    def _create_genesis_block(self):
        genesis = Block(0, {"message": "Genesis Block"}, "0", self.difficulty)
        self.chain.append(genesis)

    def get_last_block(self) -> Block:
        return self.chain[-1]

    # ------------------------------------------------------------------ #
    #  Thêm block mới — data là dict (sau này sẽ chứa merkle_root)       #
    # ------------------------------------------------------------------ #
    def add_block(self, data: dict):
        last = self.get_last_block()
        block = Block(
            index=last.index + 1,
            data=data,
            previous_hash=last.hash,
            difficulty=self.difficulty,
        )
        self.chain.append(block)

    # ------------------------------------------------------------------ #
    #  Kiểm tra tính hợp lệ: hash, liên kết, và điều kiện PoW            #
    # ------------------------------------------------------------------ #
    def is_valid(self) -> bool:
        target = "0" * self.difficulty
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]

            if curr.hash != curr.calculate_hash():
                print(f"  [INVALID] Block {i}: hash không khớp (bị sửa nội dung)")
                return False

            if curr.previous_hash != prev.hash:
                print(f"  [INVALID] Block {i}: liên kết hash với block trước bị gãy")
                return False

            if not curr.hash.startswith(target):
                print(f"  [INVALID] Block {i}: không đạt điều kiện PoW (difficulty={self.difficulty})")
                return False

        return True

    # ------------------------------------------------------------------ #
    def print_chain(self):
        for block in self.chain:
            print(f"===== Block {block.index} =====")
            print(f"Timestamp     : {block.timestamp}")
            print(f"Difficulty    : {block.difficulty}  (target: {'0' * block.difficulty}...)")
            print(f"Nonce         : {block.nonce:,}")
            print(f"Data          : {json.dumps(block.data, ensure_ascii=False, indent=2)}")
            print(f"Hash          : {block.hash}")
            print(f"Previous Hash : {block.previous_hash}\n")


# ====================================================================== #
#  Chạy thử                                                               #
# ====================================================================== #
if __name__ == "__main__":
    print("=" * 55)
    print("  Khởi tạo blockchain | difficulty = 4")
    print("=" * 55 + "\n")

    bc = Blockchain(difficulty=4)

    # Sau này data["merkle_root"] sẽ do Rust tính — tạm dùng placeholder
    bc.add_block({
        "merkle_root": "a3f1...placeholder",
        "batch_id":    "batch_001",
        "file_count":  3,
    })
    bc.add_block({
        "merkle_root": "7c9d...placeholder",
        "batch_id":    "batch_002",
        "file_count":  5,
    })

    print("\n" + "=" * 55)
    bc.print_chain()

    print("=" * 55)
    print("Kiểm tra chuỗi hợp lệ:", bc.is_valid())

    # ── Demo giả mạo ──────────────────────────────────────────
    print("\n--- Demo giả mạo: sửa merkle_root của block 1 ---")
    bc.chain[1].data["merkle_root"] = "tampered_root!"
    print("Kiểm tra sau khi sửa:", bc.is_valid())
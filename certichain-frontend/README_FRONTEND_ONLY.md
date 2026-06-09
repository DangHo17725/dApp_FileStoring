# CertiChain Frontend Only

Đây là source **FE React/Vite** đã được tách riêng từ bản CertiChain hoàn chỉnh.

FE này đã match để gọi:

- Backend API: `http://127.0.0.1:8000`
- Smart contract qua MetaMask/ethers.js
- Hardhat local hoặc Sepolia tuỳ contract address trong `.env`

## Cấu trúc

```text
certichain_frontend_only/
├─ src/                  # React source code
├─ public/               # static assets
├─ index.html
├─ package.json
├─ vite.config.js
├─ postcss.config.js
├─ .env.example
└─ start_frontend.bat
```

## Cách chạy FE

1. Copy `.env.example` thành `.env`.
2. Chỉnh `VITE_BACKEND_URL` nếu backend chạy port khác.
3. Chỉnh `VITE_CONTRACT_ADDRESS` theo address contract đã deploy.
4. Cài dependencies:

```bash
npm install --legacy-peer-deps
```

5. Chạy FE:

```bash
npm run dev
```

Mở web:

```text
http://localhost:3000
```

## Lưu ý

FE này **không chứa backend_api, original_backend, contracts, scripts, test**.
Bạn cần chạy backend và blockchain từ source BE/full project riêng.

Nếu backend tắt, một số chức năng hash file vẫn fallback về browser SHA-256, nhưng trang Backend Lab cần backend API để demo Merkle Tree, Proof of Work và validate chain.

Để up/cấp certificate, bạn cần connect MetaMask bằng ví có role Admin/Issuer. Với Hardhat local, thường dùng Account #0 sau khi chạy `npm run node` ở source full/backend.

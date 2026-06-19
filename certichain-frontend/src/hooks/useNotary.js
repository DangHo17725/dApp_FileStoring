import { useState, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import { saveNotaryLog } from '../utils/notaryStorage';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export function useNotary() {
  const { notaryContract, account } = useWeb3();
  const { addTransaction, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState(false);

  // ── Off-chain: dựng Merkle batch bằng Rust/FastAPI backend ──────────────
  // Trả về:
  // {
  //   batchId,
  //   merkleRoot,
  //   fileCount,
  //   files: [
  //     {
  //       fileName,
  //       documentHash,
  //       proof: [{ sibling, isLeft }]
  //     }
  //   ]
  // }
  const buildBatch = useCallback(async (files) => {
    const form = new FormData();

    files.forEach((file) => {
      form.append('files', file);
    });

    const res = await fetch(`${BACKEND_URL}/api/merkle/build`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      throw new Error('Merkle build thất bại. Backend có thể đang offline.');
    }

    return await res.json();
  }, []);

  // ── On-chain: công chứng cả batch, chỉ ghi Merkle Root lên contract ──────
  const notarizeBatch = useCallback(
    async (files, description = '') => {
      if (!notaryContract || !account) {
        toast.error('Hãy kết nối ví trước');
        return null;
      }

      setIsLoading(true);

      const activityId = `notary-${Date.now()}`;
      let txId = activityId;

      try {
        // 1. Build Merkle Tree / Merkle Root bằng backend
        const batch = await buildBatch(files);

        // 2. Ghi activity ban đầu vào TransactionContext
        // Activity này sẽ dùng cho Dashboard và Transaction Log
        const createdTx = addTransaction({
          id: activityId,
          type: 'DOCUMENT_NOTARY',
          action: 'Batch Notarization',
          title: 'Document Batch Notarization',
          description: description || `Công chứng lô ${batch.fileCount} file`,
          status: 'preparing',
          contract: 'DocumentNotary',
          from: account,
          merkleRoot: batch.merkleRoot,
          fileCount: batch.fileCount,
          txHash: null,
          hash: null,
          blockNumber: null,
          createdAt: new Date().toISOString(),
          metadata: {
            merkleRoot: batch.merkleRoot,
            fileCount: batch.fileCount,
            files: batch.files?.map((file) => ({
              fileName: file.fileName,
              documentHash: file.documentHash,
            })),
          },
        });

        // Tương thích cả 2 kiểu TransactionContext:
        // - addTransaction trả về object {id,...}
        // - addTransaction trả về id
        txId = createdTx?.id || createdTx || activityId;

        // 3. Kiểm tra batch đã được công chứng chưa
        const alreadyExists = await notaryContract.batchExists(batch.merkleRoot);

        if (alreadyExists) {
          const [submitter, timestamp, onChainFileCount, oldDescription] =
            await notaryContract.getBatch(batch.merkleRoot);

          const log = {
            batchId: batch.batchId || `batch_${Date.now()}`,
            type: 'DOCUMENT_NOTARY',
            status: 'already_exists',
            merkleRoot: batch.merkleRoot,
            txHash: null,
            hash: null,
            blockNumber: null,
            fileCount: batch.fileCount,
            description: oldDescription || description || '',
            submitter,
            batchOnChain: true,
            createdAt: new Date().toISOString(),
            onChainBatch: {
              submitter,
              timestamp: Number(timestamp),
              fileCount: Number(onChainFileCount),
              description: oldDescription,
            },
            files: batch.files || [],
          };

          // Cập nhật Transaction Log / Dashboard Activity
          updateTransaction(txId, {
            status: 'already_exists',
            title: 'Batch Already Notarized',
            description: 'Merkle Root này đã được công chứng trước đó',
            merkleRoot: batch.merkleRoot,
            fileCount: batch.fileCount,
            completedAt: new Date().toISOString(),
            metadata: {
              merkleRoot: batch.merkleRoot,
              fileCount: batch.fileCount,
              onChainBatch: log.onChainBatch,
            },
          });

          // Lưu riêng vào Notary Logs để tải Batch Proof JSON
          saveNotaryLog(log);

          toast.success('Batch này đã được công chứng trước đó');

          return {
            success: true,
            ...log,
          };
        }

        // 4. Gửi transaction lên Sepolia
        const tx = await notaryContract.notarize(
          batch.merkleRoot,
          batch.fileCount,
          description || ''
        );

        // Cập nhật trạng thái pending
        updateTransaction(txId, {
          status: 'pending',
          title: 'Notarizing Batch',
          description: 'Transaction đã gửi lên Sepolia, đang chờ xác nhận',
          txHash: tx.hash,
          hash: tx.hash,
          merkleRoot: batch.merkleRoot,
          fileCount: batch.fileCount,
          updatedAt: new Date().toISOString(),
        });

        toast.loading('Đã gửi giao dịch, đang chờ xác nhận…', {
          id: 'tx-notary',
        });

        // 5. Chờ transaction được xác nhận
        const receipt = await tx.wait();

        // Cập nhật trạng thái success cho Dashboard / Transaction Log
        updateTransaction(txId, {
          status: 'success',
          title: 'Batch Notarized',
          description: description || 'Document batch notarized successfully',
          txHash: tx.hash,
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
          merkleRoot: batch.merkleRoot,
          fileCount: batch.fileCount,
          completedAt: new Date().toISOString(),
          metadata: {
            merkleRoot: batch.merkleRoot,
            fileCount: batch.fileCount,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
          },
        });

        toast.dismiss('tx-notary');
        toast.success('Đã công chứng lô lên blockchain');

        // 6. Lưu Notary Log riêng để phục vụ:
        // - Notary Logs trong Document Notary
        // - Download Batch Proof JSON
        // - Verify từng file sau này
        const log = {
          batchId: batch.batchId || `batch_${Date.now()}`,
          type: 'DOCUMENT_NOTARY',
          status: 'success',
          merkleRoot: batch.merkleRoot,
          txHash: tx.hash,
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
          fileCount: batch.fileCount,
          description,
          submitter: account,
          batchOnChain: true,
          createdAt: new Date().toISOString(),
          files: batch.files || [],
        };

        saveNotaryLog(log);

        return {
          success: true,
          ...log,
        };
      } catch (error) {
        console.error('Notarize error:', error);

        updateTransaction(txId, {
          status: 'failed',
          title: 'Batch Notarization Failed',
          description:
            error?.reason ||
            error?.message ||
            'Không thể công chứng batch tài liệu',
          failedAt: new Date().toISOString(),
        });

        if (error.code === 'ACTION_REJECTED') {
          toast.error('Bạn đã từ chối giao dịch');
        } else {
          toast.error(error.reason || error.message || 'Công chứng thất bại');
        }

        return null;
      } finally {
        setIsLoading(false);
        toast.dismiss('tx-notary');
      }
    },
    [
      notaryContract,
      account,
      buildBatch,
      addTransaction,
      updateTransaction,
    ]
  );

  // ── Đọc chain: kiểm tra 1 Merkle Root đã công chứng chưa ──────────────
  const readBatch = useCallback(
    async (root) => {
      if (!notaryContract) {
        toast.error('Hãy kết nối ví trước');
        return null;
      }

      try {
        const exists = await notaryContract.batchExists(root);

        if (!exists) {
          return {
            merkleRoot: root,
            notarized: false,
            exists: false,
          };
        }

        const [submitter, timestamp, fileCount, description] =
          await notaryContract.getBatch(root);

        return {
          merkleRoot: root,
          notarized: true,
          exists: true,
          submitter,
          timestamp: Number(timestamp),
          fileCount: Number(fileCount),
          description,
        };
      } catch (error) {
        console.error('Read batch error:', error);
        toast.error(error.reason || error.message || 'Đọc dữ liệu thất bại');
        return null;
      }
    },
    [notaryContract]
  );

  // Verify nguyên batch:
  // upload lại toàn bộ file → build lại Merkle Root → kiểm tra root on-chain
  const checkBatchByFiles = useCallback(
    async (files) => {
      try {
        const batch = await buildBatch(files);
        const status = await readBatch(batch.merkleRoot);

        return status
          ? {
              ...status,
              rebuiltRoot: batch.merkleRoot,
              fileCount: batch.fileCount,
              files: batch.files,
            }
          : null;
      } catch (error) {
        console.error('Check batch error:', error);
        toast.error(error.message || 'Kiểm tra batch thất bại');
        return null;
      }
    },
    [buildBatch, readBatch]
  );

  // Verify bằng cách nhập trực tiếp Merkle Root
  const checkBatchByRoot = useCallback(
    (root) => readBatch(root),
    [readBatch]
  );

  // Băm 1 file qua backend để lấy leaf/document hash
  const hashFile = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${BACKEND_URL}/api/hash/file`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      throw new Error('Băm file thất bại. Backend có thể đang offline.');
    }

    const data = await res.json();

    return data.documentHash;
  }, []);

  // Verify 1 file bằng proof lấy từ Batch Proof JSON
  const verifyFileWithProof = useCallback(
    async ({ leafHash, proof, merkleRoot }) => {
      if (!notaryContract) {
        toast.error('Hãy kết nối ví trước');
        return null;
      }

      try {
        /**
         * Backend của bạn có thể trả proof dạng:
         * 1. [{ sibling: '0x...', isLeft: true }]
         * hoặc
         * 2. ['0x...', '0x...'] + isLeft riêng
         *
         * Đoạn dưới xử lý dạng phổ biến hiện tại:
         * proof: [{ sibling, isLeft }]
         */
        const siblings = proof.map((p) => p.sibling);
        const isLeft = proof.map((p) => p.isLeft);

        const [proofValid, batchOnChain] =
          await notaryContract.verifyAndCheck(
            leafHash,
            siblings,
            isLeft,
            merkleRoot
          );

        return {
          proofValid,
          batchOnChain,
        };
      } catch (error) {
        console.error('Verify file error:', error);
        toast.error(error.reason || error.message || 'Verify thất bại');
        return null;
      }
    },
    [notaryContract]
  );

  return {
    isLoading,
    buildBatch,
    notarizeBatch,
    checkBatchByFiles,
    checkBatchByRoot,
    hashFile,
    verifyFileWithProof,
  };
}
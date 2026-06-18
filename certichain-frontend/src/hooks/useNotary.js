import { useState, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useTransactions } from '../context/TransactionContext';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export function useNotary() {
  // notaryContract phải được Web3Context expose (xem Mảnh 1)
  const { notaryContract, account } = useWeb3();
  const { addTransaction, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState(false);

  // Dựng Merkle batch off-chain bằng Rust backend → root + proof cho từng file
  const buildBatch = useCallback(async (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const res = await fetch(`${BACKEND_URL}/api/merkle/build`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Merkle build failed');
    // { batchId, merkleRoot, fileCount, files: [{fileName, documentHash, proof:[{sibling,isLeft}]}] }
    return await res.json();
  }, []);

  // Công chứng cả lô lên chain: ghi DUY NHẤT merkleRoot vào DocumentNotary
  const notarizeBatch = useCallback(async (files, description = '') => {
    if (!notaryContract || !account) {
      toast.error('Please connect your wallet');
      return null;
    }
    setIsLoading(true);
    let txRecord;
    try {
      const batch = await buildBatch(files); // off-chain (Rust)

      txRecord = addTransaction({
        type: 'notarize',
        status: 'pending',
        description: `Notarizing batch of ${batch.fileCount} file(s)`,
      });

      const tx = await notaryContract.notarize(   // on-chain (MetaMask ký)
        batch.merkleRoot,
        batch.fileCount,
        description
      );
      updateTransaction(txRecord.id, { status: 'submitted', hash: tx.hash });
      toast.loading('Transaction submitted, waiting...', { id: 'tx-notary' });

      const receipt = await tx.wait();
      updateTransaction(txRecord.id, { status: 'confirmed', blockNumber: receipt.blockNumber });
      toast.dismiss('tx-notary');
      toast.success('Batch notarized on-chain!');

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        merkleRoot: batch.merkleRoot,
        fileCount: batch.fileCount,
        files: batch.files, // giữ proof của từng file để verify sau
      };
    } catch (error) {
      console.error('Notarize error:', error);
      if (txRecord) updateTransaction(txRecord.id, { status: 'failed', error: error.message });
      if (error.code === 'ACTION_REJECTED') toast.error('Transaction rejected by user');
      else if (error.message?.includes('da duoc cong chung')) toast.error('Batch này đã được công chứng');
      else toast.error(error.reason || error.message || 'Notarize failed');
      return null;
    } finally {
      setIsLoading(false);
      toast.dismiss('tx-notary');
    }
  }, [notaryContract, account, buildBatch, addTransaction, updateTransaction]);

  // Verify 1 file dựa trên proof + root, NGAY TRÊN CHAIN (read-only, không tốn gas)
  const verifyDocument = useCallback(async ({ leafHash, proof, merkleRoot }) => {
    if (!notaryContract) {
      toast.error('Please connect your wallet');
      return null;
    }
    try {
      const siblings = proof.map((p) => p.sibling);
      const isLeft   = proof.map((p) => p.isLeft);
      // verifyAndCheck: vừa verify proof, vừa kiểm tra batch có trên chain không
      const [proofValid, batchOnChain] = await notaryContract.verifyAndCheck(
        leafHash, siblings, isLeft, merkleRoot
      );
      return { proofValid, batchOnChain };
    } catch (error) {
      console.error('Verify document error:', error);
      toast.error(error.reason || error.message || 'Verify failed');
      return null;
    }
  }, [notaryContract]);

  // Băm 1 file qua backend (để có leafHash khi verify file rời)
  const hashFile = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BACKEND_URL}/api/hash/file`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Hash failed');
    const data = await res.json();
    return data.documentHash; // 0x...
  }, []);

  return { isLoading, buildBatch, notarizeBatch, verifyDocument, hashFile };
}
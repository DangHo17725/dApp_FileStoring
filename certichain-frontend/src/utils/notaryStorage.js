const STORAGE_KEY = 'certichain_notary_logs_v1';

export function getNotaryLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Cannot read notary logs:', error);
    return [];
  }
}

export function saveNotaryLog(log) {
  try {
    const logs = getNotaryLogs();

    const normalizedLog = {
      ...log,
      createdAt: log.createdAt || new Date().toISOString(),
      savedAt: new Date().toISOString(),
    };

    const filteredLogs = logs.filter(
      (item) =>
        item.merkleRoot?.toLowerCase() !==
        normalizedLog.merkleRoot?.toLowerCase()
    );

    const nextLogs = [normalizedLog, ...filteredLogs].slice(0, 100);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs));

    return nextLogs;
  } catch (error) {
    console.warn('Cannot save notary log:', error);
    return getNotaryLogs();
  }
}

export function clearNotaryLogs() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadJson(data, filename = 'batch-proof.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(parsed);
      } catch {
        reject(new Error('File JSON không hợp lệ'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Không đọc được file JSON'));
    };

    reader.readAsText(file);
  });
}
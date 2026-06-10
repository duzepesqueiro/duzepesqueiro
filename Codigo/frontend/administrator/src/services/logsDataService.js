import api from '../utils/api';

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.dat';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function listLogCollections() {
  const res = await api.get('/api/admin/logs/collections');
  const payload = res?.data;
  const collections = Array.isArray(payload?.collections) ? payload.collections : Array.isArray(payload) ? payload : [];
  return collections.map((c) => String(c)).filter(Boolean);
}

export async function exportLogCollection(params) {
  const collection = String(params?.collection || '').trim();
  const format = String(params?.format || '').trim().toLowerCase();
  const response = await api.get(`/api/admin/logs/export/${collection}/${format}`, { responseType: 'blob' });

  const cd = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition']);
  let filename = `${collection}.${format || 'dat'}`;
  if (cd && typeof cd === 'string') {
    const match = cd.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) filename = match[1];
  }

  triggerDownload(response.data, filename);
}


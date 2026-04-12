import api from './api';

// Download helper: triggers browser download from a Blob response
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

// Export admin dataset in specified format
export async function exportAdminData(dataset, format) {
  const path = `/api/admin/export/${dataset}/${format}`;
  const response = await api.get(path, { responseType: 'blob' });

  // Try to read filename from Content-Disposition, fallback to default
  const ext = format === 'excel' ? 'xlsx' : format;
  let filename = `export-${dataset}.${ext}`;
  const cd = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition']);
  if (cd && typeof cd === 'string') {
    const match = cd.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) filename = match[1];
  }

  triggerDownload(response.data, filename);
}
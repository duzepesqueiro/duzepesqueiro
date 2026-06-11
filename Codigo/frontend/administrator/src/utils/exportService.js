import api from './api';

// Download helper: triggers browser download from a Blob response
function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.dat';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    window.URL.revokeObjectURL(url);
  }, 1000);
}

// Export admin dataset in specified format
export async function exportAdminData(dataset, format) {
  const manifestPath = `/api/admin/export/${dataset}/${format}/manifest`;
  const manifestResponse = await api.get(manifestPath);
  const files = Array.isArray(manifestResponse?.data?.files) ? manifestResponse.data.files : [];
  if (!files.length) {
    throw new Error('Nenhum arquivo disponível para exportação.');
  }

  for (const file of files) {
    const path = typeof file?.url === 'string' ? file.url : `/api/admin/export/${dataset}/${format}`;
    const response = await api.get(path, { responseType: 'blob' });

    const cd = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition']);
    let filename = typeof file?.filename === 'string' ? file.filename : 'export.dat';
    if (cd && typeof cd === 'string') {
      const match = cd.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) filename = match[1];
    }

    triggerDownload(response.data, filename);
  }
}

import client from '../../../api/client';
import { cleanParams } from '../../analytics/api/analyticsApi';

function filenameFromDisposition(header) {
  const match = header?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || null;
}

export const reportsApi = {
  async downloadProjectPdf(projectId, filters = {}, fallbackName = 'reporte-wildstat.pdf') {
    const response = await client.get(`/reports/project/${projectId}/pdf`, {
      params: cleanParams(filters),
      responseType: 'blob',
    });

    const filename =
      filenameFromDisposition(response.headers['content-disposition']) || fallbackName;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

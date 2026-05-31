import client from '../../../api/client';

export const detectionsApi = {
  getPending: () => client.get('/detections/pending').then((r) => r.data),
  getValidated: () => client.get('/detections/validated').then((r) => r.data),
  getDiscarded: () => client.get('/detections/discarded').then((r) => r.data),
  getAll: (params) => client.get('/detections', { params }).then((r) => r.data),
  getOne: (id) => client.get(`/detections/${id}`).then((r) => r.data),
  getValidationContext: (id) =>
    client.get(`/detections/${id}/validation-context`).then((r) => r.data),
  validate: (id, body) =>
    client.patch(`/detections/${id}/validate`, body).then((r) => r.data),
  updateReviewStatus: (id, reviewStatus) =>
    client
      .patch(`/detections/${id}/review-status`, { reviewStatus })
      .then((r) => r.data),
  frameUrl: (id) =>
    `${import.meta.env.VITE_API_URL}/detections/${id}/frame`,
  clipUrl: (id) =>
    `${import.meta.env.VITE_API_URL}/detections/${id}/clip`,
};

export const speciesApi = {
  getAll: () => client.get('/species').then((r) => r.data),
  create: (commonName, scientificName) =>
    client.post('/species', { commonName, scientificName }).then((r) => r.data),
};

export const datasetApi = {
  getValidated: (params) =>
    client.get('/dataset/validated', { params }).then((r) => r.data),
  exportValidatedCsv: (params) =>
    client
      .get('/dataset/validated/export/csv', { params, responseType: 'blob' })
      .then((r) => r.data),
};

export const projectsApi = {
  getAll: () => client.get('/projects').then((r) => r.data),
};

export const camerasApi = {
  getAll: (projectId) =>
    client.get('/cameras', { params: { projectId } }).then((r) => r.data),
};

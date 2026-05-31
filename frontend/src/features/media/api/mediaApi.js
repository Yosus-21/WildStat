import client from '../../../api/client';

export const mediaApi = {
  getProjects: () => client.get('/projects').then((r) => r.data),
  getCameras: (projectId) =>
    client.get('/cameras', { params: projectId ? { projectId } : {} }).then((r) => r.data),
  getMedia: (mediaFileId) => client.get(`/media/${mediaFileId}`).then((r) => r.data),
  getMediaStatus: (mediaFileId) =>
    client.get(`/media/${mediaFileId}/status`).then((r) => r.data),
  getMediaList: (params) => client.get('/media', { params }).then((r) => r.data),
  getDetectionsByMedia: (mediaFileId) =>
    client.get('/detections', { params: { mediaFileId } }).then((r) => r.data),
  uploadMedia: ({ file, projectId, cameraId, recordingDate, onUploadProgress }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('cameraId', cameraId);
    if (recordingDate) {
      formData.append('recordingDate', new Date(recordingDate).toISOString());
    }

    return client
      .post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then((r) => r.data);
  },
};

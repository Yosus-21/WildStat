import client from '../../../api/client';

export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );
}

const get = (url, params) =>
  client.get(url, { params: cleanParams(params) }).then((r) => r.data);

export const analyticsApi = {
  getSummary: (params) => get('/analytics/summary', params),
  getSpeciesFrequency: (params) => get('/analytics/species-frequency', params),
  getJaguarAbundance: (params) => get('/analytics/jaguar-abundance', params),
  getByZone: (params) => get('/analytics/by-zone', params),
  getByMonth: (params) => get('/analytics/by-month', params),
  getSexRatio: (params) => get('/analytics/sex-ratio', params),
  getActivityByHour: (params) => get('/analytics/activity-by-hour', params),
  getSimpleDensity: (params) => get('/analytics/simple-density', params),
  getSharedHabitat: (params) => get('/analytics/shared-habitat', params),
  getTrend: (params) => get('/analytics/trend', params),
};

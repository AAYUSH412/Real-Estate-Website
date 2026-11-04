import apiClient from './apiClient.js';
export const aiModelsAPI = {
  list: signal => apiClient.get('/api/admin/ai-models', { signal }),
  create: values => apiClient.post('/api/admin/ai-models', { ...values, provider: 'nvidia' }),
  update: (model, values) => apiClient.put(`/api/admin/ai-models/${model._id}`, { ...values, expectedVersion: model.version }),
  remove: (model, values = {}) => apiClient.delete(`/api/admin/ai-models/${model._id}`, { data: { ...values, expectedVersion: model.version } }),
  test: (model, mode = 'application') => apiClient.post(`/api/admin/ai-models/${model._id}/test`, { expectedVersion: model.version, mode }),
  reorder: models => apiClient.post('/api/admin/ai-models/reorder', { modelIds: models.map(row => row._id), expectedVersions: Object.fromEntries(models.map(row => [row._id, row.version])) }),
};

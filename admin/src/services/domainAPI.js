import apiClient from './apiClient.js';
import { reviewCommand } from '@buildestate/contracts';

export const listingReviewAPI = {
  approve: record => apiClient.put(`/api/admin/properties/${record._id}/approve`, reviewCommand(record)),
  reject: (record, reason) => apiClient.put(`/api/admin/properties/${record._id}/reject`, reviewCommand(record, reason)),
};

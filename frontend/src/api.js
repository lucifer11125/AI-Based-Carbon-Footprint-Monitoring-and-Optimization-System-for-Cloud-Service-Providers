import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register'];

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carbonlens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = error.config?.url || '';
    const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => requestPath.endsWith(path));

    if (error.response?.status === 401 && !isPublicAuthRequest) {
      localStorage.removeItem('carbonlens_token');
      localStorage.removeItem('carbonlens_user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Companies ───
export const companyAPI = {
  list: () => api.get('/companies/'),
  create: (data) => api.post('/companies/', data),
  getDetail: (id) => api.get(`/companies/${id}`),
  delete: (id) => api.delete(`/companies/${id}`),
};

// ─── Datasets ───
export const datasetAPI = {
  upload: (companyId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/datasets/upload/${companyId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (companyId) => api.get(`/datasets/company/${companyId}`),
  getDashboard: (datasetId) => api.get(`/datasets/${datasetId}/dashboard`),
  getPredictions: (datasetId) => api.get(`/datasets/${datasetId}/predictions`),
  getRecommendations: (datasetId) => api.get(`/datasets/${datasetId}/recommendations`),
  getAudit: (datasetId) => api.get(`/datasets/${datasetId}/audit`),
  preview: (datasetId, limit = 50) => api.get(`/datasets/${datasetId}/preview`, { params: { limit } }),
  download: (datasetId) => api.get(`/datasets/${datasetId}/download`, { responseType: 'blob' }),
  simulate: (datasetId, params) => api.post(`/datasets/${datasetId}/simulate`, params),
  delete: (datasetId) => api.delete(`/datasets/${datasetId}`),
};

// ─── Admin ───
export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};

// ─── Reports ───
export const reportAPI = {
  create: (data) => api.post('/reports/', data),
  uploadFile: (datasetId, reportType, file) => {
    const formData = new FormData();
    formData.append('dataset_id', datasetId);
    formData.append('report_type', reportType);
    formData.append('file', file);
    return api.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/reports/'),
  listByCompany: (companyId) => api.get(`/reports/company/${companyId}`),
  delete: (reportId) => api.delete(`/reports/${reportId}`),
  getDownloadUrl: (reportId) => {
    const token = localStorage.getItem('carbonlens_token');
    return `${API_BASE}/reports/${reportId}/download?token=${token}`; // Assuming you might handle query token or just fetch it
  },
  download: (reportId) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
};

export default api;

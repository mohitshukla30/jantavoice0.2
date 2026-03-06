import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://jantavoice0-2.onrender.com/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('jv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jv_token');
      localStorage.removeItem('jv_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: data => api.post('/auth/register', data),
  login: data => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: data => api.put('/auth/profile', data),
  changePassword: data => api.put('/auth/change-password', data),
};

export const complaintAPI = {
  getAll: params => api.get('/complaints', { params }),
  getById: id => api.get(`/complaints/${id}`),
  getMy: params => api.get('/complaints/my', { params }),
  create: formData => api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  like: id => api.put(`/complaints/${id}/like`),
  comment: (id, text) => api.post(`/complaints/${id}/comment`, { text }),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
  delete: id => api.delete(`/complaints/${id}`),
  getStats: () => api.get('/complaints/stats'),
  aiCategorize: data => api.post('/complaints/ai-categorize', data),
  extractDetails: data => api.post('/complaints/extract-details', data),
  quickFile: data => api.post('/complaints/quick-file', data),
  transcribeAudio: formData => api.post('/complaints/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  generateLetter: id => api.post(`/complaints/${id}/generate-letter`, {}, { responseType: 'blob' }),
};

export const govAPI = {
  submit: (complaintId) => api.post(`/gov/submit/${complaintId}`),
  checkStatus: (ticketId) => api.get(`/gov/status/${ticketId}`),
  getMyTickets: () => api.get('/gov/my-tickets'),
  checkGovStatus: (ticketId, portal) => api.post('/gov/check', { ticketId, portal }),
  getMyGovTickets: () => api.get('/gov/my-tickets'),
  getAllAdminGovTickets: () => api.get('/gov/admin/tickets'),
};

export const automationAPI = {
  getRules: () => api.get('/automation/rules'),
  toggleRule: (id) => api.put(`/automation/rules/${id}`),
  getLogs: () => api.get('/automation/logs'),
  runNow: () => api.post('/automation/run-now'),
};

export const notifAPI = {
  getAll: () => api.get('/notifications'),
  markRead: id => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const generateLetter = (complaintId) =>
  api.get('/complaints/' + complaintId + '/generate-letter', { responseType: 'blob' });

export default api;

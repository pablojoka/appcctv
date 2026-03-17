import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);

// Users
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getUserHistory = (id) => api.get(`/users/${id}/history`);

// Events
export const getEvents = () => api.get('/events');
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// Rooms
export const createRoom = (eventId, data) => api.post(`/events/${eventId}/rooms`, data);
export const updateRoom = (roomId, data) => api.put(`/events/rooms/${roomId}`, data);
export const deleteRoom = (roomId) => api.delete(`/events/rooms/${roomId}`);

// Room equipment
export const addRoomEquipment = (roomId, data) => api.post(`/events/rooms/${roomId}/equipment`, data);
export const removeRoomEquipment = (id) => api.delete(`/events/rooms/equipment/${id}`);

// Room staff
export const addRoomStaff = (roomId, data) => api.post(`/events/rooms/${roomId}/staff`, data);
export const removeRoomStaff = (id) => api.delete(`/events/rooms/staff/${id}`);

// Inventory
export const getInventory = () => api.get('/inventory');
export const getCategories = () => api.get('/inventory/categories');
export const createEquipment = (data) => api.post('/inventory', data);
export const updateEquipment = (id, data) => api.put(`/inventory/${id}`, data);
export const deleteEquipment = (id) => api.delete(`/inventory/${id}`);
export const createCategory = (data) => api.post('/inventory/categories', data);
export const getEquipmentHistory = (id) => api.get(`/inventory/${id}/history`);
export const deleteEquipmentHistory = (id) => api.delete(`/inventory/history/${id}`);
export const deleteUserHistory = (id) => api.delete(`/users/history/${id}`);

// Reports
export const getReports = () => api.get('/reports');
export const getReport = (eventId) => api.get(`/reports/${eventId}`);
export const createReport = (data) => api.post('/reports', data);

// Tutorials
export const getTutorials = () => api.get('/tutorials');
export const uploadTutorial = (formData) => api.post('/tutorials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteTutorial = (id) => api.delete(`/tutorials/${id}`);
export const getTutorialFileUrl = (id) => `/api/tutorials/${id}/file`;

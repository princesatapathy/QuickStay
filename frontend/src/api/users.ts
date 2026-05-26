import api from './client';

export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data: unknown) => api.patch('/users/profile', data);
export const getGuests = () => api.get('/users/guests');
export const addGuest = (data: unknown) => api.post('/users/guests', data);
export const updateGuest = (guestId: number, data: unknown) =>
  api.put(`/users/guests/${guestId}`, data);
export const deleteGuest = (guestId: number) => api.delete(`/users/guests/${guestId}`);

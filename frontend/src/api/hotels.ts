import api from './client';

export interface HotelSearchParams {
  city: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  roomsCount: number;
  page?: number;
  size?: number;
}

export const searchHotels = (params: HotelSearchParams) =>
  api.get('/hotels/search', { params: { ...params, page: params.page ?? 0, size: params.size ?? 10 } });

export const getHotelInfo = (hotelId: number) => api.get(`/hotels/${hotelId}/info`);

// Admin
export const createHotel = (data: unknown) => api.post('/admin/hotels', data);
export const getAdminHotels = () => api.get('/admin/hotels');
export const updateHotel = (hotelId: number, data: unknown) => api.put(`/admin/hotels/${hotelId}`, data);
export const deleteHotel = (hotelId: number) => api.delete(`/admin/hotels/${hotelId}`);
export const activateHotel = (hotelId: number) => api.patch(`/admin/hotels/${hotelId}/activate`);
export const getHotelReports = (hotelId: number, startDate?: string, endDate?: string) =>
  api.get(`/admin/hotels/${hotelId}/reports`, {
    params: { ...(startDate && { startDate }), ...(endDate && { endDate }) },
  });

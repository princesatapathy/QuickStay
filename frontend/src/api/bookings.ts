import api from './client';

export interface BookingRequest {
  hotelId: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  roomsCount: number;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;   // paise
  currency: string;
  keyId: string;
}

export interface RazorpayVerifyRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export const initBooking = (data: BookingRequest) => api.post('/bookings/init', data);
export const addGuests = (bookingId: number, guests: { id: number; name: string; gender: string; age: number }[]) =>
  api.post(`/bookings/${bookingId}/addGuests`, guests);

export const initiatePayment = (bookingId: number) =>
  api.post<{ data: RazorpayOrderResponse }>(`/bookings/${bookingId}/payments`);

export const verifyPayment = (bookingId: number, data: RazorpayVerifyRequest) =>
  api.post(`/bookings/${bookingId}/verify-payment`, data);

export const mockConfirmBooking = (bookingId: number) =>
  api.post(`/bookings/${bookingId}/mock-confirm`);
export const cancelBooking = (bookingId: number) =>
  api.post(`/bookings/${bookingId}/cancel`);
export const getBooking = (bookingId: number) =>
  api.get(`/bookings/${bookingId}`);
export const getBookingStatus = (bookingId: number) =>
  api.get(`/bookings/${bookingId}/status`);
export const getMyBookings = () => api.get('/users/myBookings');

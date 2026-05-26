import api from './client';

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface ManagerSignUpData extends SignUpData {
  managerCode: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const signup = (data: SignUpData) => api.post('/auth/signup', data);
export const signupManager = (data: ManagerSignUpData) => api.post('/auth/signup-manager', data);
export const login = (data: LoginData) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const refreshToken = () => api.post('/auth/refresh');

export interface User {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface State {
  _id: string;
  name: string;
  code: string;
  country: string;
  population?: number;
  area?: number;
  capital?: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  permissions: Permission[];
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export interface StateFormData {
  name: string;
  code: string;
  country: string;
  population?: number;
  area?: number;
  capital?: string;
  isActive: boolean;
}
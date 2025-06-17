export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Matryx Medizys',
  company: {
    name: import.meta.env.VITE_COMPANY_NAME || 'Matryx Medizys',
    website: import.meta.env.VITE_COMPANY_WEBSITE || 'https://techcorp.com',
    email: 'contact@techcorp.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Ave, Tech City, TC 12345',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
  },
  auth: {
    tokenKey: 'auth-storage',
    refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
};

export const PERMISSIONS = {
  STATES: {
    VIEW: 'states_view',
    CREATE: 'states_create',
    UPDATE: 'states_update',
    DELETE: 'states_delete',
  },
  USERS: {
    VIEW: 'users_view',
    CREATE: 'users_create',
    UPDATE: 'users_update',
    DELETE: 'users_delete',
  },
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
  DASHBOARD: '/dashboard',
  STATES: {
    LIST: '/states',
    NEW: '/states/new',
    VIEW: (id: string) => `/states/${id}`,
    EDIT: (id: string) => `/states/${id}/edit`,
  },
  USERS: {
    LIST: '/users',
    NEW: '/users/new',
    VIEW: (id: string) => `/users/${id}`,
    EDIT: (id: string) => `/users/${id}/edit`,
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
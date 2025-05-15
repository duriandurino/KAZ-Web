import axios from 'axios';

/**
 * Standardized API client for making requests to the backend
 * - Uses consistent baseURL
 * - Automatically includes API key
 * - Handles error responses consistently
 */
const apiClient = axios.create({
  baseURL: '/api',  // This ensures all requests go through the proxy to the backend
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY
  }
});

// Add a request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.params || {});
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        data: error.response?.data
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient; 
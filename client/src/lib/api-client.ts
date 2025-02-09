import { QueryClient } from '@tanstack/react-query';

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  // In development, use the backend port (5000)
  if (process.env.NODE_ENV === 'development') {
    // Use window.location.protocol and hostname, but with port 5000
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`;
  }
  return '';
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Helper function for making API requests
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  console.log('Making API request to:', url);
  console.log('Request options:', {
    method: options.method || 'GET',
    headers: options.headers,
    credentials: options.credentials,
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for cookies/sessions
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      console.error('API Error:', error);
      throw new Error(error.message || 'Failed to fetch data');
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};
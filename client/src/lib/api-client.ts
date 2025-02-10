import { QueryClient } from '@tanstack/react-query';

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`; // Always use port 5000 for API
  }
  return '';
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Increase retry attempts
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 5000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
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

  console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`);
  console.log('[API Request] Full URL:', url);
  console.log('[API Request] Options:', {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  try {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[API Response] Status: ${response.status}`);
    console.log('[API Response] Headers:', Object.fromEntries(response.headers.entries()));

    // Get the response text first for debugging
    const responseText = await response.text();
    console.log('[API Response] Raw response:', responseText);

    // Try to parse as JSON if possible
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('[API Error] Failed to parse response as JSON:', parseError);
      console.error('[API Error] Raw response was:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    if (!response.ok) {
      const errorMessage = data?.message || response.statusText || 'An unknown error occurred';
      console.error('[API Error]', errorMessage, data);
      throw new Error(errorMessage);
    }

    if (data === null || data === undefined) {
      console.error('[API Error] Response was empty');
      throw new Error('Empty response from server');
    }

    console.log('[API Success] Data:', data);
    return data;
  } catch (error) {
    console.error('[API Error] Request failed:', error);
    if (error instanceof Error) {
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      if (!navigator.onLine) {
        throw new Error('Lost internet connection');
      }
      throw error;
    }
    throw new Error('Failed to make API request');
  }
};
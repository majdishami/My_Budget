import { QueryClient } from '@tanstack/react-query';

// Determine the API base URL based on the environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000'; // Always use port 5000 for API in development
  }
  return ''; // Use relative URLs in production
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
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

  try {
    // Check network connectivity
    if (!navigator.onLine) {
      console.error('[API Error] No internet connection');
      throw new Error('No internet connection');
    }

    console.log(`[API Request] ${options.method || 'GET'} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      credentials: 'include', // Include credentials for cross-origin requests
    });

    clearTimeout(timeoutId);

    // Get the response text first for debugging
    const responseText = await response.text();
    console.log('[API Response] Status:', response.status);
    console.log('[API Response] Raw response:', responseText);

    // Try to parse as JSON if possible
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
      console.log('[API Response] Parsed data:', data);
    } catch (parseError) {
      console.error('[API Error] Failed to parse response as JSON:', parseError);
      console.error('[API Error] Raw response was:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    if (!response.ok) {
      const errorMessage = data?.message || response.statusText || 'An unknown error occurred';
      console.error('[API Error] Response not OK:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('[API Error] Request failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to make API request');
  }
};
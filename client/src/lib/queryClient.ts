import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Create a function to handle common error messages
function formatErrorMessage(error: Error): string {
  if (error.message.includes('Failed to fetch')) {
    return 'Network error: Please check your connection';
  }
  if (error.message.startsWith('401:')) {
    return 'Authentication required';
  }
  if (error.message.startsWith('403:')) {
    return 'Access denied';
  }
  if (error.message.startsWith('404:')) {
    return 'Resource not found';
  }
  if (error.message.startsWith('500:')) {
    return 'Server error: Please try again later';
  }
  return error.message;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on client-side errors
        if (error instanceof Error && error.message.match(/^[45]\d\d:/)) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: formatErrorMessage(error),
          variant: "destructive",
        });
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on client-side errors
        if (error instanceof Error && error.message.match(/^[45]\d\d:/)) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: formatErrorMessage(error),
          variant: "destructive",
        });
      },
    },
  },
});
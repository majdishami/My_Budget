import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function ErrorTest() {
  const [isLoading404, setIsLoading404] = useState(false);
  const [isLoading500, setIsLoading500] = useState(false);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);

  const { refetch: test404 } = useQuery({
    queryKey: ['/api/test/error/404'],
    enabled: false,
    retry: false,
    throwOnError: true
  });

  const { refetch: test500 } = useQuery({
    queryKey: ['/api/test/error/500'],
    enabled: false,
    retry: false,
    throwOnError: true
  });

  const { refetch: testNetwork } = useQuery({
    queryKey: ['/api/test/error/network'],
    enabled: false,
    retry: false,
    throwOnError: true
  });

  const handleTest404 = async () => {
    if (isLoading404) return;
    setIsLoading404(true);
    try {
      await test404();
    } catch (error) {
      console.error('404 Error Test:', error);
    } finally {
      setIsLoading404(false);
    }
  };

  const handleTest500 = async () => {
    if (isLoading500) return;
    setIsLoading500(true);
    try {
      await test500();
    } catch (error) {
      console.error('500 Error Test:', error);
    } finally {
      setIsLoading500(false);
    }
  };

  const handleTestNetwork = async () => {
    if (isLoadingNetwork) return;
    setIsLoadingNetwork(true);
    try {
      await testNetwork();
    } catch (error) {
      console.error('Network Error Test:', error);
    } finally {
      setIsLoadingNetwork(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Error Handling Test</h2>
      <div className="space-x-4">
        <Button 
          onClick={handleTest404} 
          disabled={isLoading404}
        >
          {isLoading404 ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test 404 Error'
          )}
        </Button>
        <Button 
          onClick={handleTest500}
          disabled={isLoading500}
        >
          {isLoading500 ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test 500 Error'
          )}
        </Button>
        <Button 
          onClick={handleTestNetwork}
          disabled={isLoadingNetwork}
        >
          {isLoadingNetwork ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Network Error'
          )}
        </Button>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export function ErrorTest() {
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
    try {
      await test404();
    } catch (error) {
      // Error will be handled by queryClient's onError
      console.error('404 Error Test:', error);
    }
  };

  const handleTest500 = async () => {
    try {
      await test500();
    } catch (error) {
      // Error will be handled by queryClient's onError
      console.error('500 Error Test:', error);
    }
  };

  const handleTestNetwork = async () => {
    try {
      await testNetwork();
    } catch (error) {
      // Error will be handled by queryClient's onError
      console.error('Network Error Test:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Error Handling Test</h2>
      <div className="space-x-4">
        <Button onClick={handleTest404}>Test 404 Error</Button>
        <Button onClick={handleTest500}>Test 500 Error</Button>
        <Button onClick={handleTestNetwork}>Test Network Error</Button>
      </div>
    </div>
  );
}
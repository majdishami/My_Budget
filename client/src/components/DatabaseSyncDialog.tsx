import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function DatabaseSyncDialog() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/sync/backup");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to generate backup");

      // Trigger file download
      window.location.href = data.downloadUrl;

      toast({
        title: "Backup Generated",
        description: "Your database backup has been generated and download should start automatically.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Sync Database
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Database Synchronization</DialogTitle>
          <DialogDescription>
            Generate a backup of your current database that you can import into your local environment.
            After downloading, use the following command to restore:
            <code className="block mt-2 p-2 bg-muted rounded-md">
              pg_restore -h localhost -U your_user -d your_database backup_file.dump
            </code>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Generating Backup..." : "Generate Backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

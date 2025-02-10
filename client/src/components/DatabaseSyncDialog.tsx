import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download, Upload, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DatabaseSyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatabaseSyncDialog({ isOpen, onOpenChange }: DatabaseSyncDialogProps) {
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleBackup = async () => {
    try {
      setIsBackupLoading(true);
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
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Failed to backup database",
        variant: "destructive",
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a backup file to restore",
        variant: "destructive",
      });
      return;
    }

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['json', 'dump'].includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid backup file (.json or .dump)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRestoreLoading(true);
      const formData = new FormData();
      formData.append('backup', selectedFile);

      const response = await fetch('/api/sync/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to restore backup");

      toast({
        title: "Restore Successful",
        description: "Your database has been restored from the backup file.",
      });

      // Reset file selection
      setSelectedFile(null);

      // Close the dialog after successful restore
      onOpenChange(false);

      // Reload the page to reflect the restored data
      window.location.reload();
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore database",
        variant: "destructive",
      });
    } finally {
      setIsRestoreLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Database Synchronization</DialogTitle>
          <DialogDescription>
            Backup your current database or restore from a previous backup.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="backup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
          </TabsList>

          <TabsContent value="backup" className="space-y-4">
            <Alert>
              <AlertDescription>
                Generate a backup of your current database that you can import later.
                After downloading, keep this file safe as it contains all your data.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={handleBackup} disabled={isBackupLoading}>
                {isBackupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBackupLoading ? "Generating Backup..." : "Generate Backup"}
                {!isBackupLoading && <Download className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            <Alert>
              <AlertDescription>
                Restore your database from a previously generated backup file.
                Supported formats: .json and .dump files. This will replace all current data with the data from the backup.
              </AlertDescription>
            </Alert>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="backup-file">Select Backup File</Label>
              <div className="flex flex-col gap-2">
                <Input 
                  id="backup-file"
                  type="file"
                  accept=".json,.dump"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                    <FileIcon className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleRestore} 
                disabled={isRestoreLoading || !selectedFile}
              >
                {isRestoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRestoreLoading ? "Restoring..." : "Restore Backup"}
                {!isRestoreLoading && <Upload className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
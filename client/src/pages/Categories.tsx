import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoryManager } from "@/components/CategoryManager";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary>
      <div className="p-4 space-y-4">
        <Card className="p-4">
          <h1 className="text-2xl font-bold mb-4">Categories Management</h1>
          <CategoryManager />
        </Card>
      </div>
    </ErrorBoundary>
  );
}

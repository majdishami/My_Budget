import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoryManager } from "@/components/CategoryManager";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/lib/logger";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary>
      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Budget
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Categories Management</h1>
          </div>
          <CategoryManager />
        </Card>
      </div>
    </ErrorBoundary>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Circle, Plus, Edit, Trash, Loader2, AlertCircle } from "lucide-react";
import { CategoryDialog } from "./CategoryDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { apiRequest } from '@/lib/api-client';

// Enhanced TypeScript interfaces
interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
  created_at?: string;
}

interface CategoryFormData {
  name: string;
  color: string;
  icon?: string;
}

interface DialogState {
  add: boolean;
  edit: Category | null;
  delete: Category | null;
}

export function CategoryManager() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Centralized dialog state management
  const [dialogState, setDialogState] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // Enhanced error handling and loading states with retry
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      console.log('Fetching categories...');
      try {
        const result = await apiRequest('/api/categories');
        console.log('Categories fetch result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Loading state with skeleton UI
  if (isLoadingCategories) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Categories</h2>
          <div className="w-32 h-9 bg-gray-200 animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="p-4">
                <div className="w-full h-6 bg-gray-200 animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state with retry button
  if (categoriesError) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="text-red-800">
                <h3 className="font-semibold">Failed to load categories</h3>
                <p className="text-sm">Please try again later</p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Mutation with proper error handling and loading states
  const createMutation = useMutation({
    mutationFn: async (newCategory: CategoryFormData) => {
      return apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCategory.name,
          color: newCategory.color,
          icon: newCategory.icon
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category created",
        description: "The category has been created successfully.",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error creating category",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Category) => {
      return apiRequest(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name.trim(),
          color: data.color.trim(),
          icon: data.icon?.trim() || null
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error updating category",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/categories/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error deleting category",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  // Enhanced handlers with proper TypeScript types
  const handleSubmit = (data: CategoryFormData) => {
    if (dialogState.edit) {
      updateMutation.mutate({ ...data, id: dialogState.edit.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setDialogState(prev => ({ ...prev, edit: category }));
  };

  const handleDelete = (category: Category) => {
    setDialogState(prev => ({ ...prev, delete: category }));
  };

  const handleCloseDialogs = () => {
    setDialogState({ add: false, edit: null, delete: null });
  };

  const confirmDelete = () => {
    if (dialogState.delete) {
      deleteMutation.mutate(dialogState.delete.id);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button
          onClick={() => setDialogState(prev => ({ ...prev, add: true }))}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <div className="p-4">
              <div className="text-base font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" fill={category.color} stroke="none" />
                  {category.name}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    disabled={updateMutation.isPending}
                    aria-label={`Edit ${category.name}`}
                  >
                    {updateMutation.isPending && updateMutation.variables?.id === category.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Delete ${category.name}`}
                  >
                    {deleteMutation.isPending && dialogState.delete?.id === category.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CategoryDialog
        isOpen={dialogState.add || dialogState.edit !== null}
        onOpenChange={(open) => {
          if (!open) handleCloseDialogs();
        }}
        onSubmit={handleSubmit}
        initialData={dialogState.edit || undefined}
      />

      <AlertDialog
        open={dialogState.delete !== null}
        onOpenChange={(open) => {
          if (!open) handleCloseDialogs();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
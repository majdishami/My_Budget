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
  icon?: string | null;
  created_at?: string;
}

interface CategoryFormData {
  name: string;
  color: string;
  icon?: string | null;
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

  // State management
  const [dialogState, setDialogState] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  // Categories query with enhanced error handling
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch,
    isError
  } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      console.log('Fetching categories...');
      try {
        const response = await apiRequest('/api/categories');
        console.log('Categories fetch response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
  });

  // Event handlers
  const handleCloseDialogs = () => {
    setDialogState({ add: false, edit: null, delete: null });
  };

  const handleEdit = (category: Category) => {
    setDialogState(prev => ({ ...prev, edit: category }));
  };

  const handleDelete = (category: Category) => {
    setDialogState(prev => ({ ...prev, delete: category }));
  };

  const handleSubmit = (data: CategoryFormData) => {
    if (dialogState.edit) {
      updateMutation.mutate({ ...data, id: dialogState.edit.id });
    } else {
      createMutation.mutate(data);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newCategory: CategoryFormData) => {
      return apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Category) => {
      return apiRequest(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
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
        title: "Success",
        description: "Category deleted successfully",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const confirmDelete = () => {
    if (dialogState.delete) {
      deleteMutation.mutate(dialogState.delete.id);
    }
  };

  // Loading state
  if (isLoadingCategories) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-2 bg-slate-200 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
            <div className="text-center">
              <h3 className="font-semibold text-red-900">Failed to load categories</h3>
              <p className="text-sm text-red-600 mt-1">
                {categoriesError instanceof Error ? categoriesError.message : 'An unexpected error occurred'}
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
          <Card key={category.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" fill={category.color} stroke="none" />
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(category)}
                  disabled={updateMutation.isPending}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CategoryDialog
        open={dialogState.add || !!dialogState.edit}
        onOpenChange={(open) => {
          if (!open) handleCloseDialogs();
        }}
        onSubmit={handleSubmit}
        defaultValues={dialogState.edit}
      />

      <AlertDialog open={!!dialogState.delete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Circle, Plus, Edit, Trash, Loader2, AlertCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
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
import { apiRequest } from '@/lib/api-client';

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

// Dynamic icon component
const DynamicIcon = ({ iconName }: { iconName: string | null | undefined }) => {
  if (!iconName) return null;

  // Convert icon name to match Lucide naming convention (e.g., "shopping-cart" to "ShoppingCart")
  const formatIconName = (name: string) => {
    return name.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  };

  const IconComponent = (LucideIcons as any)[formatIconName(iconName)];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
};

export function CategoryManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryFormData | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const {
    data: categories = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        console.log('[Categories] Starting fetch request...');
        const response = await apiRequest('/api/categories');
        console.log('[Categories] Response received:', response);
        return response;
      } catch (error) {
        console.error('[Categories] Error:', error);
        throw error;
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Success", description: "Category created successfully" });
      setIsAddOpen(false);
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
    mutationFn: (data: { id: number } & CategoryFormData) =>
      apiRequest(`/api/categories/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          color: data.color,
          icon: data.icon
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Success", description: "Category updated successfully" });
      setEditCategory(null);
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
    mutationFn: (id: number) =>
      apiRequest(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Success", description: "Category deleted successfully" });
      setDeleteCategory(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CategoryFormData) => {
    if (editCategory) {
      const categoryToUpdate = categories.find(c =>
        c.name === editCategory.name &&
        c.color === editCategory.color &&
        c.icon === editCategory.icon
      );

      if (categoryToUpdate) {
        updateMutation.mutate({
          id: categoryToUpdate.id,
          ...data
        });
      }
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
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

  if (queryError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
            <div className="text-center">
              <h3 className="font-semibold text-red-900">Failed to load categories</h3>
              <p className="text-sm text-red-600 mt-1">
                {queryError instanceof Error ? queryError.message : 'An unexpected error occurred'}
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
          onClick={() => setIsAddOpen(true)}
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
        {categories.map((category: Category) => (
          <Card key={category.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" fill={category.color} stroke="none" />
                <DynamicIcon iconName={category.icon} />
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditCategory({
                    name: category.name,
                    color: category.color,
                    icon: category.icon
                  })}
                  disabled={updateMutation.isPending}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteCategory(category)}
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
        isOpen={isAddOpen || !!editCategory}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditCategory(null);
          }
        }}
        onSubmit={handleSubmit}
        initialData={editCategory}
      />

      <AlertDialog open={!!deleteCategory}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCategory(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
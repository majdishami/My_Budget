import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Circle, Palette } from "lucide-react";
import { ChromePicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { findBestCategoryMatch } from "@/lib/smartTagging";
import { Category } from "@/types";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  color: z.string().min(1, "Color is required").max(50),
  icon: z.string().nullish(),
  suggested_category_id: z.number().nullish(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialData?: CategoryFormData;
  showSuccessMessage?: boolean;
  expenseDescription?: string;
  categories?: Category[];
}

export function CategoryDialog({ 
  isOpen, 
  onOpenChange, 
  onSubmit, 
  initialData,
  showSuccessMessage = false,
  expenseDescription,
  categories = []
}: CategoryDialogProps) {
  const { toast } = useToast();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      color: initialData?.color ?? "#000000",
      icon: initialData?.icon ?? null,
      suggested_category_id: null,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      form.reset({
        name: initialData.name,
        color: initialData.color,
        icon: initialData.icon,
      });
    }
  }, [isOpen, initialData, form]);

  // Auto-suggest category based on expense description
  useEffect(() => {
    if (expenseDescription && categories.length > 0) {
      const match = findBestCategoryMatch(expenseDescription, categories);
      if (match && match.confidence > 0.5) {
        form.setValue('suggested_category_id', match.category.id);
        // Optionally, you can auto-fill the form with the suggested category
        if (!initialData) {
          form.setValue('name', match.category.name);
          form.setValue('color', match.category.color || '#000000');
          form.setValue('icon', match.category.icon || null);
        }
      }
    }
  }, [expenseDescription, categories, form, initialData]);

  const handleSubmit = async (data: CategoryFormData) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: data.name.trim(),
        color: data.color,
        icon: data.icon?.trim() ?? null,
        suggested_category_id: data.suggested_category_id,
      });

      if (showSuccessMessage) {
        toast({
          title: initialData ? "Category updated" : "Category created",
          description: `Successfully ${initialData ? 'updated' : 'created'} category "${data.name}"`,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!submitting) {
        onOpenChange(open);
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="text" 
                      placeholder="Enter category name"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      aria-autocomplete="none"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full flex items-center justify-between"
                          disabled={submitting}
                        >
                          <span className="flex items-center gap-2">
                            <Circle className="h-4 w-4" fill={field.value} />
                            <span className="truncate">{field.value}</span>
                          </span>
                          <Palette className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 border-none">
                        <ChromePicker 
                          color={field.value}
                          onChange={(color) => {
                            field.onChange(color.hex);
                            setColorPickerOpen(false);
                          }}
                          disableAlpha
                        />
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="text"
                      placeholder="e.g., shopping-cart"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      autoComplete="off"
                      disabled={submitting}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use kebab-case Lucide icon names (e.g., shopping-cart, credit-card, home)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {initialData ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
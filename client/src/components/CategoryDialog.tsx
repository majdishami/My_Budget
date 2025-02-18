import { useState, useEffect, useMemo } from "react";
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

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().nullable().optional()
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CategoryFormData) => void;
  initialData?: CategoryFormData;
}

export function CategoryDialog({ isOpen, onOpenChange, onSubmit, initialData }: CategoryDialogProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const randomInputId = useMemo(() => Math.random().toString(36).substring(7), []);

  const defaultFormValues = useMemo(() => ({
    name: initialData?.name || "",
    color: initialData?.color || "#000000",
    icon: initialData?.icon || null
  }), [initialData]);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultFormValues,
    mode: "onChange"
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultFormValues);
    }
  }, [isOpen, defaultFormValues, form]);

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      console.log('Form data before validation:', data);
      const formattedData = {
        name: data.name.trim(),
        color: data.color,
        icon: data.icon?.trim() || null
      };
      console.log('Formatted data:', formattedData);
      await onSubmit(formattedData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting category:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            className="space-y-4"
            autoComplete="off"
          >
            {/* Hidden input to prevent autofill */}
            <input 
              type="text" 
              id="prevent_autofill" 
              name="prevent_autofill" 
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter category name" 
                      {...field} 
                      type="text"
                      name={`category_name_${randomInputId}`}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      aria-autocomplete="none"
                      aria-label="Category name"
                      data-private="true"
                      autoCapitalize="off"
                      autoCorrect="off"
                      maxLength={50}
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
                        <Button variant="outline" className="w-full flex items-center justify-between">
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
                      placeholder="e.g., shopping-cart, credit-card" 
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      type="text"
                      name={`category_icon_${randomInputId}`}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      aria-autocomplete="none"
                      aria-label="Category icon"
                      data-private="true"
                      autoCapitalize="off"
                      autoCorrect="off"
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
              <Button type="submit">
                {initialData ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
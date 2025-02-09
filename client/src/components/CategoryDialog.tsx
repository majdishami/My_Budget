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
  icon: z.string().optional()
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

  const defaultFormValues = useMemo(() => 
    initialData || { name: "", color: "#000000", icon: "" },
    [initialData]
  );

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultFormValues
  });

  // Reset form when initialData changes
  useEffect(() => {
    form.reset(defaultFormValues);
  }, [defaultFormValues, form]);

  const handleSubmit = (data: CategoryFormData) => {
    onSubmit({
      ...data,
      icon: data.icon?.trim() || undefined // Convert empty string to undefined
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" autoComplete="off">
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
                      autoComplete="off"
                      spellCheck="false"
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
                            field.onChange(color?.hex || "#000000");
                            setColorPickerOpen(false); // Close picker after selection
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
                      placeholder="Enter icon name" 
                      {...field} 
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </FormControl>
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
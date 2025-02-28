
import { Toast, toast as showToast } from "../components/ui/toast";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export function useToast() {
  const toast = ({ title, description, variant = "default", duration = 3000 }: ToastProps) => {
    showToast({
      title,
      description,
      variant,
      duration,
    });
  };

  return { toast };
}

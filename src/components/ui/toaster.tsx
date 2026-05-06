import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map(function ({ id, title, description, action, variant, ...props }, index) {
        const isDestructive = variant === "destructive";
        const colorVariant = isDestructive ? "destructive" : index % 2 === 0 ? "default" : "blush";
        return (
          <Toast key={id} {...props} variant={colorVariant}>
            <div className="grid gap-0.5">
              {title && <ToastTitle className="text-white font-semibold text-sm">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-white/90 text-xs">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-white/70 hover:text-white" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

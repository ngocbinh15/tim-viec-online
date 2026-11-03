"use client";

import {
  CircleCheck,
  CircleAlert,
  CircleX,
  Info,
  LoaderCircle,
} from "lucide-react";
import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      gap={12}
      offset={24}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: "feedback-toast",
          title: "feedback-toast-title",
          description: "feedback-toast-description",
          icon: "feedback-toast-icon",
          closeButton: "feedback-toast-close",
        },
        closeButtonAriaLabel: "Đóng thông báo",
      }}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleX aria-hidden="true" />,
        warning: <CircleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle className="animate-spin" aria-hidden="true" />,
      }}
    />
  );
}

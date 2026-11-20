"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ open, onOpenChange, title, children, drawer = false, className, headerMark }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  drawer?: boolean;
  className?: string;
  headerMark?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={["dialog", drawer && "drawer", className].filter(Boolean).join(" ")} onCloseAutoFocus={(event) => {
          const active = document.activeElement;
          if (active instanceof HTMLElement && active !== document.body) event.preventDefault();
        }}>
          <div className="dialog-head">
            {headerMark}
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close"><X size={20} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title} panel</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

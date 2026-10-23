"use client";
import { useEffect, useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  initialFocusRef,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  size?: "md" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const sizeClassName = size === "xl" ? "max-w-5xl" : "max-w-lg";
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !isOpen) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    initialFocusRef?.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [initialFocusRef, isOpen]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${sizeClassName} overflow-y-auto rounded-2xl border-0 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 backdrop:backdrop-blur-sm sm:p-8`}
    >
      {children}
    </dialog>
  );
}

Modal.displayName = 'Modal';

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiMore2Fill } from "react-icons/ri";
import type { IconType } from "react-icons";

export interface ActionMenuItem {
  label: string;
  icon: IconType;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export default function ActionMenu({
  label = "Más acciones",
  items,
  alwaysVisible = false,
}: {
  label?: string;
  items: ActionMenuItem[];
  alwaysVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number }>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closeFromScroll = () => setOpen(false);
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    window.addEventListener("scroll", closeFromScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
      window.removeEventListener("scroll", closeFromScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      menuRef.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
  }, [open]);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = items.length * 48 + 12;
    const fitsBelow = window.innerHeight - rect.bottom >= estimatedHeight;
    setPosition({
      top: fitsBelow
        ? rect.bottom + 4
        : Math.max(8, rect.top - estimatedHeight - 4),
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setOpen(true);
  }

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${alwaysVisible ? "" : "md:hidden"}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={toggleMenu}
      >
        <RiMore2Fill aria-hidden="true" size={21} />
      </button>
      {open &&
        position &&
        createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            className="fixed z-50 min-w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg"
            style={{ top: position.top, right: position.right }}
          >
            {items.map(
              ({
                label: itemLabel,
                icon: Icon,
                onSelect,
                disabled,
                destructive,
              }) => (
                <li key={itemLabel}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 ${destructive ? "text-red-700 hover:bg-red-50" : "text-zinc-800"}`}
                    disabled={disabled}
                    onClick={() => {
                      setOpen(false);
                      onSelect();
                    }}
                  >
                    <Icon aria-hidden="true" size={18} />
                    <span>{itemLabel}</span>
                  </button>
                </li>
              ),
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}

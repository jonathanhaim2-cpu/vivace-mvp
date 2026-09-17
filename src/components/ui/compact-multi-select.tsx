"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { accentCheckboxClassName, nativeControlClassName } from "@/components/ui/compact-form";
import { cn } from "@/lib/utils";

export type CompactMultiSelectOption = { value: string; label: string };

export function CompactMultiSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "בחירה",
  required = false,
  requiredMessage = "יש לבחור לפחות פריט אחד",
  id,
  className,
  onChange,
}: {
  name: string;
  options: CompactMultiSelectOption[];
  defaultValue?: string[];
  placeholder?: string;
  required?: boolean;
  requiredMessage?: string;
  id?: string;
  className?: string;
  onChange?: (values: string[]) => void;
}) {
  const uid = useId();
  const triggerId = id ?? `${uid}-trigger`;
  const listId = `${uid}-list`;
  const validityRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const selectedSet = new Set(selected);
  const labels = options.filter((option) => selectedSet.has(option.value)).map((option) => option.label);
  const summary =
    labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(" · ") : `${labels[0]} +${labels.length - 1}`;

  function commit(next: string[]) {
    setSelected(next);
    onChange?.(next);
  }

  function toggle(value: string) {
    commit(selectedSet.has(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  useEffect(() => {
    const node = validityRef.current;
    if (!node) return;
    node.setCustomValidity(required && selected.length === 0 ? requiredMessage : "");
  }, [required, requiredMessage, selected.length]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    };
    update();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && rect && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={triggerId}
            className="fixed z-[80] max-h-64 min-w-[12rem] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{
              top: rect.bottom + 4,
              left: rect.left,
              width: Math.max(rect.width, 192),
            }}
          >
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">אין אפשרויות</p>
            ) : (
              options.map((option) => {
                const checked = selectedSet.has(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <input
                      type="checkbox"
                      role="option"
                      aria-selected={checked}
                      checked={checked}
                      onChange={() => toggle(option.value)}
                      className={accentCheckboxClassName}
                    />
                    {option.label}
                  </label>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative min-w-[10rem]", className)}>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <input
        ref={validityRef}
        tabIndex={-1}
        className="sr-only"
        value={selected.length ? "1" : ""}
        required={required}
        aria-hidden
        onChange={() => undefined}
      />
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={cn(nativeControlClassName, "flex items-center justify-between gap-1 text-start")}
      >
        <span className={cn("min-w-0 flex-1 truncate", labels.length === 0 && "text-muted-foreground")}>{summary}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {panel}
    </div>
  );
}

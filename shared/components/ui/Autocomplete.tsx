"use client";

import { useId, useMemo, useRef, useState } from "react";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

interface AutocompleteProps {
  id?: string;
  label: string;
  value: string;
  options: AutocompleteOption[];
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  selectedValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  required?: boolean;
  selectedLabel?: string;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export default function Autocomplete({
  id: providedId,
  label,
  value,
  options,
  onChange,
  onSelect,
  selectedValue,
  placeholder,
  disabled = false,
  className = "field mt-2",
  emptyMessage = "No se encontraron resultados.",
  required = false,
  selectedLabel,
}: AutocompleteProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const listId = `${id}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isEntitySelector = selectedValue !== undefined;
  const [query, setQuery] = useState("");
  const searchValue = isEntitySelector ? query : value;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(searchValue.trim());
    return (
      normalizedQuery
        ? options.filter((option) =>
            normalize(
              `${option.label} ${option.description ?? ""}`,
            ).includes(normalizedQuery),
          )
        : options
    ).slice(0, 50);
  }, [options, searchValue]);

  function selectOption(option: AutocompleteOption) {
    if (isEntitySelector) setQuery("");
    else onChange(option.label);
    onSelect?.(option);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null))
          setIsOpen(false);
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={isEntitySelector ? query || selectedLabel || "" : value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          if (isEntitySelector) {
            setQuery(event.target.value);
            onChange("");
          } else onChange(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) =>
              Math.min(index + 1, filteredOptions.length - 1),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
            event.preventDefault();
            const option = filteredOptions[activeIndex];
            if (option) selectOption(option);
          } else if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {isOpen && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <li
                id={`${listId}-${index}`}
                key={option.value}
                role="option"
                aria-selected={index === activeIndex}
                className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {option.description && (
                  <span className="ml-2 text-xs text-zinc-500">
                    {option.description}
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-zinc-500">{emptyMessage}</li>
          )}
        </ul>
      )}
    </div>
  );
}

import { units, unitLabels, type Unit } from "@/app/lib/units";
import Autocomplete from "@/shared/components/ui/Autocomplete";

export default function UnitSelect({
  value,
  onChange,
  options = units,
  label = "Unidad de medida",
  disabled = false,
  compact = false,
}: {
  value: Unit;
  onChange: (unit: Unit) => void;
  options?: readonly Unit[];
  label?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  if (options.length <= 2) {
    return (
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Unit)}
        className={
          compact
            ? "h-10 w-full min-w-0 rounded-lg border border-zinc-300 px-1 text-sm sm:h-9"
            : "field mt-2"
        }
      >
        {options.map((unit) => (
          <option key={unit} value={unit}>
            {compact ? unit : unitLabels[unit]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Autocomplete
      label={label}
      value=""
      selectedLabel={compact ? value : unitLabels[value]}
      options={options.map((unit) => ({
        value: unit,
        label: compact ? unit : unitLabels[unit],
      }))}
      onSelect={(option) => onChange(option.value as Unit)}
      disabled={disabled}
      className={
        compact
          ? "h-10 w-full min-w-0 rounded-lg border border-zinc-300 px-1 text-sm sm:h-9"
          : "field mt-2"
      }
      placeholder={compact ? "Unidad" : "Selecciona una unidad"}
    />
  );
}

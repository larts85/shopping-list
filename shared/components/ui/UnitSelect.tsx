import { unitLabels, unitsForCategory, type Unit } from "@/app/lib/units";
import Autocomplete from "@/shared/components/ui/Autocomplete";

export default function UnitSelect({
  value,
  onChange,
  options = unitsForCategory(),
  label = "Unidad de medida",
  disabled = false,
  compact = false,
  hideLabel = false,
}: {
  value: Unit;
  onChange: (unit: Unit) => void;
  options?: readonly Unit[];
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
}) {
  // Compact selectors sit beside a column heading. A caller can also hide the
  // internal label when it provides its own visible label around the control.
  // Native selects keep both cases to one aligned control without an extra
  // visible Autocomplete label.
  if (compact || hideLabel || options.length <= 2) {
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
      selectedValue={value}
      selectedLabel={compact ? value : unitLabels[value]}
      options={options.map((unit) => ({
        value: unit,
        label: compact ? unit : unitLabels[unit],
      }))}
      onChange={() => undefined}
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

UnitSelect.displayName = 'UnitSelect';

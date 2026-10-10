import { units, unitLabels, type Unit } from "@/app/lib/units";
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
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Unit)}
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

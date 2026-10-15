"use client";
import { unitLabels, unitsForCategory, type Unit } from "@/app/lib/units";

export default function AvailableUnitsField({
  selected,
  onChange,
  requiredUnit,
  categoryName = "",
  disabled = false,
}: {
  selected: Unit[];
  onChange: (units: Unit[]) => void;
  requiredUnit?: Unit;
  categoryName?: string;
  disabled?: boolean;
}) {
  function toggle(unit: Unit, checked: boolean) {
    onChange(
      checked
        ? [...new Set([...selected, unit])]
        : selected.filter((value) => value !== unit),
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium">Unidades disponibles</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {unitsForCategory(categoryName).map((unit) => (
          <label key={unit} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(unit)}
              disabled={unit === requiredUnit}
              onChange={(event) => toggle(unit, event.target.checked)}
            />
            {unitLabels[unit]}
          </label>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Puedes elegir más de una unidad, incluso combinar peso, volumen y
        unidades.
      </p>
    </fieldset>
  );
}

AvailableUnitsField.displayName = 'AvailableUnitsField';

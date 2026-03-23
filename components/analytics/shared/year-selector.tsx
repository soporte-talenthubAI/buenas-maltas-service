interface YearSelectorProps {
  year: number;
  onChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export function YearSelector({ year, onChange, minYear = 2022, maxYear }: YearSelectorProps) {
  const max = maxYear || new Date().getFullYear();
  const years = Array.from({ length: max - minYear + 1 }, (_, i) => minYear + i);

  return (
    <select
      value={year}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
    >
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

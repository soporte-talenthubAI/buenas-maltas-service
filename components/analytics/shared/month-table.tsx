const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface MonthTableProps<T> {
  data: T[];
  monthKeys: string[];
  labelKey: keyof T;
  getMonthValue: (row: T, monthKey: string) => number;
  getTotal: (row: T) => number;
  formatValue?: (value: number) => string;
  highlightTop?: number;
  brandColors?: Record<string, string>;
  brandKey?: keyof T;
}

export function MonthTable<T>({
  data,
  monthKeys,
  labelKey,
  getMonthValue,
  getTotal,
  formatValue = (v) => v.toLocaleString("es-AR"),
  highlightTop,
}: MonthTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-black sticky left-0 bg-white min-w-[200px]">
              Nombre
            </th>
            {monthKeys.map((mk, i) => (
              <th key={mk} className="text-right py-2 px-2 font-medium text-black min-w-[70px]">
                {MONTH_LABELS[i] || mk}
              </th>
            ))}
            <th className="text-right py-2 px-2 font-bold text-black min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const isHighlighted = highlightTop && idx < highlightTop;
            return (
              <tr
                key={String(row[labelKey])}
                className={`border-b ${isHighlighted ? "bg-amber-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="py-1.5 px-2 text-black sticky left-0 bg-inherit font-medium truncate max-w-[200px]">
                  {String(row[labelKey])}
                </td>
                {monthKeys.map((mk) => {
                  const val = getMonthValue(row, mk);
                  return (
                    <td key={mk} className="py-1.5 px-2 text-right text-black tabular-nums">
                      {val > 0 ? formatValue(val) : <span className="text-gray-300">-</span>}
                    </td>
                  );
                })}
                <td className="py-1.5 px-2 text-right font-bold text-black tabular-nums">
                  {formatValue(getTotal(row))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { Input } from "@/components/ui/input";

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export function DateFilter({ dateFrom, dateTo, onFromChange, onToChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={dateFrom} onChange={(e) => onFromChange(e.target.value)} className="w-40" />
      <span className="text-black text-sm">a</span>
      <Input type="date" value={dateTo} onChange={(e) => onToChange(e.target.value)} className="w-40" />
    </div>
  );
}

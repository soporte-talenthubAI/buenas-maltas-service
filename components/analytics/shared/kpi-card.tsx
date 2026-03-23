import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export function KPICard({ title, value, subtitle, color = "text-black" }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-sm text-black">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-black mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

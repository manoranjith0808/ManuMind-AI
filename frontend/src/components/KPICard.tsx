import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  color: "blue" | "green" | "red" | "amber" | "cyan" | "purple";
}

const colorMap = {
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  red: "border-l-red-500",
  amber: "border-l-amber-500",
  cyan: "border-l-cyan-500",
  purple: "border-l-purple-500",
};

const textMap = {
  blue: "text-blue-500 dark:text-blue-400",
  green: "text-green-500 dark:text-green-400",
  red: "text-red-500 dark:text-red-400",
  amber: "text-amber-500 dark:text-amber-400",
  cyan: "text-cyan-500 dark:text-cyan-400",
  purple: "text-purple-500 dark:text-purple-400",
};

export function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color }: KPICardProps) {
  return (
    <div className={cn(
      "glass rounded-xl p-5 border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={cn("p-2.5 rounded-lg bg-opacity-10 bg-current", textMap[color])}>
          <Icon size={24} />
        </div>
      </div>
      
      <div className="mt-4 flex items-center text-sm">
        <span className={cn(
          "flex items-center font-medium mr-2",
          trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-slate-500"
        )}>
          {trend === "up" && <TrendingUp size={16} className="mr-1" />}
          {trend === "down" && <TrendingDown size={16} className="mr-1" />}
          {trend === "neutral" && <Minus size={16} className="mr-1" />}
          {trendValue}
        </span>
        <span className="text-muted-foreground truncate">{subtitle}</span>
      </div>
    </div>
  );
}

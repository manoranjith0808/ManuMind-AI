import { cn, getStatusColor } from "@/lib/utils";

interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
  health: number;
  temp: number;
  vib: number;
  power: number;
}

export function MachineStatusTable({ machines }: { machines: Machine[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg font-medium">Machine</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Health Score</th>
            <th className="px-4 py-3 font-medium">Temp (°C)</th>
            <th className="px-4 py-3 font-medium">Vib (mm/s)</th>
            <th className="px-4 py-3 rounded-tr-lg font-medium">Power (kW)</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine, i) => {
            const statusColor = getStatusColor(machine.status);
            
            return (
              <tr 
                key={machine.id} 
                className="border-b border-border/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors last:border-0"
              >
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <div className="font-mono text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{machine.id}</div>
                  {machine.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{machine.type}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className={cn(
                        "w-2 h-2 rounded-full",
                        machine.status.toLowerCase() === 'breakdown' && "animate-pulse"
                      )}
                      style={{ backgroundColor: statusColor }}
                    />
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{ 
                        color: statusColor, 
                        backgroundColor: `${statusColor}15`,
                        borderColor: `${statusColor}30`
                      }}
                    >
                      {machine.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden max-w-[100px]">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          machine.health >= 80 ? "bg-green-500" : machine.health >= 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${machine.health}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{machine.health}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "font-mono",
                    machine.temp > 80 ? "text-red-500 font-bold" : "text-muted-foreground"
                  )}>
                    {machine.temp}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{machine.vib.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{machine.power.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

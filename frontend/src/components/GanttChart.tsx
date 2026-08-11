"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "gantt-task-react/dist/index.css";

// Dynamically import Gantt to prevent SSR issues
const Gantt = dynamic(
  () => import("gantt-task-react").then((mod) => mod.Gantt),
  { ssr: false }
);

interface CustomTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: "task" | "project";
  project?: string;
  styles?: any;
}

export function GanttChart({ tasks }: { tasks: CustomTask[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading Gantt Chart...</div>;
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border gantt-container dark-gantt">
      <Gantt
        tasks={tasks}
        viewMode={"Hour" as any}
        columnWidth={60}
        rowHeight={40}
        fontSize="12px"
        fontFamily="inherit"
        listCellWidth="150px"
        projectBackgroundColor="#1e293b"
        projectProgressColor="#3b82f6"
        projectProgressSelectedColor="#2563eb"
      />
      <style dangerouslySetInnerHTML={{__html: `
        .dark-gantt ._3zl2_ { fill: var(--background) !important; }
        .dark-gantt ._3T42_ { fill: var(--foreground) !important; }
        .dark-gantt ._3w_5j { stroke: var(--border) !important; }
        .dark-gantt ._3ErO2 { fill: var(--border) !important; }
        .dark-gantt ._2dZ0D { fill: var(--foreground) !important; }
      `}} />
    </div>
  );
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVerdictColor(verdict?: string) {
  switch (verdict?.toLowerCase()) {
    case "pass": return "bg-success/15 text-success border-success/30";
    case "partial": return "bg-warning/15 text-warning border-warning/30";
    case "fail": return "bg-destructive/15 text-destructive border-destructive/30";
    case "running": return "bg-primary/15 text-primary border-primary/30 animate-pulse";
    case "pending": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function getVerdictIcon(verdict?: string) {
  switch (verdict?.toLowerCase()) {
    case "pass": return "CheckCircle2";
    case "partial": return "AlertCircle";
    case "fail": return "XCircle";
    case "running": return "Loader2";
    default: return "Clock";
  }
}

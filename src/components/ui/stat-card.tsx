import type { ReactNode } from "react";

export function StatCard({ label, value, note, icon, tone = "orange" }: {
  label: string; value: string; note: string; icon: ReactNode; tone?: "orange" | "green" | "purple" | "blue";
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon stat-icon-${tone}`}>{icon}</span>
      <div><p>{label}</p><strong>{value}</strong><small>{note}</small></div>
    </div>
  );
}

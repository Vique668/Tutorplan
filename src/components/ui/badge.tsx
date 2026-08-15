export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "orange" | "blue" | "purple" | "gray" | "red" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

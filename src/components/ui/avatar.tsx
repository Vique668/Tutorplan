type AvatarProps = {
  initials: string;
  color?: "orange" | "purple" | "blue" | "green" | "peach" | "pink";
  size?: "sm" | "md" | "lg";
};

export function Avatar({ initials, color = "orange", size = "md" }: AvatarProps) {
  return <span className={`avatar avatar-${color} avatar-${size}`}>{initials}</span>;
}

import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-decoration" aria-hidden="true" />
      <section className="auth-card">
        <Link href="/login" className="auth-logo" aria-label="TutorPlan">
          <img src="/brand/logo-full.png?v=transparent-1" alt="TutorPlan" width={178} height={60} />
        </Link>
        <div className="auth-copy">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </div>
  );
}

export function AuthMessage({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return <div className={`auth-message auth-message-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

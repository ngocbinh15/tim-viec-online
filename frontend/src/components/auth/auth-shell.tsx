import type { AuthKind } from "@/features/auth/types";

export function AuthShell({
  kind,
  title,
  description,
  children,
}: {
  kind: AuthKind | "verify" | "confirm-password-change";
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-container" data-kind={kind}>
      <section
        className="auth-card surface"
        aria-labelledby={`auth-${kind}-title`}
      >
        <header>
          <h1 id={`auth-${kind}-title`}>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </div>
  );
}

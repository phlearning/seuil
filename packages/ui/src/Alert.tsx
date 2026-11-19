import type { ReactNode } from "react";

export interface AlertProps {
  title: string;
  children: ReactNode;
  /** "error" interrupts screen readers (role=alert), "info" waits politely (role=status). */
  tone?: "info" | "error";
}

export function Alert({ title, children, tone = "info" }: AlertProps) {
  return (
    <div className="seuil-alert" role={tone === "error" ? "alert" : "status"}>
      <p className="seuil-alert__title">
        <strong>{title}</strong>
      </p>
      <div>{children}</div>
    </div>
  );
}

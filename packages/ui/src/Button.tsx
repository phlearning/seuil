import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

/** Defaults to type="button" so it never submits a form by accident. */
export function Button({ variant = "primary", type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={["seuil-button", `seuil-button--${variant}`, className].filter(Boolean).join(" ")} {...props} />;
}

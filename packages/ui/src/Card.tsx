import { useId, type ReactNode } from "react";

export interface CardProps {
  title: string;
  /** Heading level, so the card fits the page outline (WCAG 1.3.1). */
  level?: 2 | 3 | 4;
  children: ReactNode;
}

export function Card({ title, level = 2, children }: CardProps) {
  const id = useId();
  const Heading = `h${level}` as const;
  return (
    <section className="seuil-card" aria-labelledby={id}>
      <Heading className="seuil-card__title" id={id}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

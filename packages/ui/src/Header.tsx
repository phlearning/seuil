export interface NavItem {
  label: string;
  href: string;
  current?: boolean;
}

export interface HeaderProps {
  siteName: string;
  homeHref?: string;
  nav?: NavItem[];
  /** id of the page's <main>, target of the skip link (WCAG 2.4.1). */
  mainId?: string;
}

export function Header({ siteName, homeHref = "/", nav = [], mainId = "contenu" }: HeaderProps) {
  return (
    <header className="seuil-header">
      <a className="seuil-skip-link" href={`#${mainId}`}>
        Aller au contenu
      </a>
      <a className="seuil-header__home" href={homeHref}>
        {siteName}
      </a>
      {nav.length > 0 && (
        <nav aria-label="Navigation principale">
          <ul className="seuil-header__nav">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={item.current ? "page" : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

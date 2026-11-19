import { mount, PAGES } from "./layout.js";

mount(
  "./plan-du-site.html",
  <>
    <h1>Plan du site</h1>
    <ul>
      {PAGES.map((p) => (
        <li key={p.href}>
          <a href={p.href}>{p.label}</a>
        </li>
      ))}
    </ul>
  </>,
);

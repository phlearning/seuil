import { mount, PAGES } from "./layout.js";

mount(
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
  "./plan-du-site.html",
);

/**
 * Audience measurement without a third party: one anonymous page view sent to our
 * own server. No cookie, no identifier, nothing stored in the browser, so no
 * consent is needed and the CSP stays strict (same origin only).
 */
export function countPageView(): void {
  const view = JSON.stringify({ page: location.pathname, at: new Date().toISOString().slice(0, 10) });
  navigator.sendBeacon?.("./api/stats", new Blob([view], { type: "application/json" }));
}

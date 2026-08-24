/**
 * Carries the dashboard scope on URLs the browser navigates to directly.
 *
 * Normal API calls go through fetch(), which sets an `X-EV-Dashboard` header so
 * the server knows which of the five dashboards is asking. A direct navigation
 * - window.open, an <a href>, an iframe, a print window - cannot set a custom
 * header at all.
 *
 * Server-side, dashboardScopeFromReq() reads the header, the body, or
 * `?dashboard=`, and normalises anything unrecognised to "travel". So a PDF
 * opened with window.open arrived carrying no scope, was read as "travel", and
 * adminAuth refused it with DASHBOARD_ACCESS_DENIED for every account that does
 * not hold travel access - which is most of them.
 *
 * `?dashboard=` is the only one of the three a navigation can use, so anything
 * opened this way has to go through here.
 */

function currentScope() {
  try {
    if (typeof window === "undefined") return "";
    return String(window.__EV_DASHBOARD_SCOPE || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function withDashboardScope(url) {
  const scope = currentScope();
  if (!scope) return url;
  const separator = String(url).includes("?") ? "&" : "?";
  return `${url}${separator}dashboard=${encodeURIComponent(scope)}`;
}

export default withDashboardScope;

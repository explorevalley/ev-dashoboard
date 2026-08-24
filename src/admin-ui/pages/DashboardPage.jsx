import React from "react";
import CustomerOrdersTable from "../components/CustomerOrdersTable";

function safeText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function detectDashboardScope() {
  try {
    if (typeof window === "undefined") return "travel";
    const forcedScope = safeText(window.__EV_DASHBOARD_SCOPE || "").toLowerCase();
    if (forcedScope === "admin" || forcedScope === "all") return "admin";
    if (forcedScope === "food") return "food";
    if (forcedScope === "mart_vendor" || forcedScope === "vendor" || forcedScope === "martvendor") return "mart_vendor";
    if (forcedScope === "support" || forcedScope === "customer_support" || forcedScope === "customer-support") return "support";
  } catch {}
  return "travel";
}

export default function DashboardPage({ snapshot, tablesByName, onReload, onOpenImages, onUpsert, onPatch, DashboardView, ReviewsWidget }) {
  const dashboardScope = detectDashboardScope();
  // Was the analytics hero. Charts summarised orders without ever showing one,
  // so the first thing on the dashboard is now the orders themselves, each with
  // its status control. Travel gets it too: its dashboard is the travel desk's
  // landing page, and "what has come in" is the question being asked there as
  // much as anywhere. Support is the exception — it lands on its refunds queue.
  const showTopOrders = dashboardScope !== "support";
  // Travel is the orders table and nothing else: no tab strip, no reviews
  // widget under it. Everything that used to sit below was a partial view of
  // the same orders, so the table is the page. Food keeps its reviews widget —
  // only its tab strip was already hidden.
  const showOrderManagerInsideDashboard = dashboardScope !== "food" && dashboardScope !== "travel";
  const showReviews = dashboardScope !== "travel";
  const hideCustomerSupportSection = dashboardScope === "support";
  const hidePricingSection = dashboardScope === "support";
  return (
    <>
      {showTopOrders ? (
        <CustomerOrdersTable
          tablesByName={tablesByName}
          onUpsert={onUpsert}
          onPatch={onPatch}
          onReload={onReload}
        />
      ) : null}
      {showOrderManagerInsideDashboard ? (
        <DashboardView
          snapshot={snapshot}
          tablesByName={tablesByName}
          onReload={onReload}
          onOpenImages={onOpenImages}
          onUpsert={onUpsert}
          onPatch={onPatch}
          showLiveQueueSection={false}
          showOrdersSection={!hideCustomerSupportSection}
          showPricingSection={!hidePricingSection}
          defaultSection={dashboardScope === "support" ? "refunds" : null}
        />
      ) : null}
      {showReviews ? <ReviewsWidget snapshot={snapshot} /> : null}
    </>
  );
}

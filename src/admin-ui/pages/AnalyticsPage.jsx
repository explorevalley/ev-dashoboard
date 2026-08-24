import React from "react";
import AdminAnalyticsPanel from "../components/AdminAnalyticsPanel";

export default function AnalyticsPage({ tablesByName, dashboardScope, children }) {
  return (
    <>
      <AdminAnalyticsPanel tablesByName={tablesByName} dashboardScope={dashboardScope} />
      {children}
    </>
  );
}

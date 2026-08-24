import React from "react";

export default function NotificationsPage({ NotificationsWorkspace, items, onOpen, onDismiss }) {
  return <NotificationsWorkspace items={items} onOpen={onOpen} onDismiss={onDismiss} />;
}

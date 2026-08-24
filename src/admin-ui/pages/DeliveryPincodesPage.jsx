import React from "react";

export default function DeliveryPincodesPage({
  DeliveryPincodesWorkspace,
  snapshot,
  TABLES,
  onUpsert,
  onDelete,
  onReload
}) {
  return (
    <DeliveryPincodesWorkspace
      snapshot={snapshot}
      TABLES={TABLES}
      onUpsert={onUpsert}
      onDelete={onDelete}
      onReload={onReload}
    />
  );
}

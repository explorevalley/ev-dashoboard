import React from "react";

export default function OrderManagerPage({ snapshot, tablesByName, onReload, onOpenImages, onUpsert, onPatch, DashboardView }) {
  return (
    <DashboardView
      snapshot={snapshot}
      tablesByName={tablesByName}
      onReload={onReload}
      onOpenImages={onOpenImages}
      onUpsert={onUpsert}
      onPatch={onPatch}
    />
  );
}

import React from "react";

export default function FoodMenuIconsPage({ FoodMenuIconsWorkspace, snapshot, onReload, onUpsert, onPatch, TABLES }) {
  return (
    <FoodMenuIconsWorkspace
      snapshot={snapshot}
      onReload={onReload}
      onUpsert={onUpsert}
      onPatch={onPatch}
      TABLES={TABLES}
    />
  );
}

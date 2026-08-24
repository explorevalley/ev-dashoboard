import React from "react";

export default function CategoryIconsPage({ FoodCategoryIconsWorkspace, snapshot, onReload, onUpsert, onPatch, TABLES, adminApiForm }) {
  return (
    <FoodCategoryIconsWorkspace
      snapshot={snapshot}
      onReload={onReload}
      onUpsert={onUpsert}
      onPatch={onPatch}
      TABLES={TABLES}
      adminApiForm={adminApiForm}
    />
  );
}

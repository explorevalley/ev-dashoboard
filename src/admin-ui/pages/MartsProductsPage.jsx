import React from "react";

export default function MartsProductsPage({ MartCatalogWorkspace, snapshot, onReload, onUpsert, onDelete, ...rest }) {
  return (
    <MartCatalogWorkspace
      snapshot={snapshot}
      onReload={onReload}
      onUpsert={onUpsert}
      onDelete={onDelete}
      {...rest}
    />
  );
}

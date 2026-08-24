import React from "react";

export default function FoodVendorsPage({ FoodVendorsWorkspace, snapshot, onReload, onOpenImages, onUpsert, onDelete, ...rest }) {
  return (
    <FoodVendorsWorkspace
      snapshot={snapshot}
      onReload={onReload}
      onOpenImages={onOpenImages}
      onUpsert={onUpsert}
      onDelete={onDelete}
      {...rest}
    />
  );
}

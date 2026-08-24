import React from "react";

export default function CustomerSupportPage({ EnquiriesWorkspace, table, onReload, onOpenImages, onUpsert }) {
  return (
    <div className="card">
      <div className="row mb-8">
        <h3 className="m-0">Customer Support</h3>
        <button className="btn small" onClick={onReload}>Reload</button>
      </div>
      <EnquiriesWorkspace
        table={table}
        onReload={onReload}
        onOpenImages={onOpenImages}
        onUpsert={onUpsert}
      />
    </div>
  );
}

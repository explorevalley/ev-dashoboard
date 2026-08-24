import React, { useEffect, useMemo, useState } from "react";
import MartVendorPortal from "./MartVendorPortal";
import { adminApiForm } from "./LegacyComponents";
import { downloadCsv } from "./csvExport";

const INVENTORY_COLUMN_OPTIONS = [
  { key: "image_upload", label: "Upload" },
  { key: "product", label: "Product" },
  { key: "description", label: "Description" },
  { key: "category", label: "Category" },
  { key: "type", label: "Type" },
  { key: "unit", label: "Unit" },
  { key: "vendor_price", label: "Vendor Price" },
  { key: "ev_percentage", label: "EV %" },
  { key: "customer_price", label: "Customer Price" },
  { key: "mrp", label: "MRP" },
  { key: "discount", label: "Discount" },
  { key: "stock", label: "Stock" },
  { key: "status", label: "Status" }
];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function buildCatalogProducts(rows) {
  const byName = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const name = safeText(row?.name || row?.title);
    if (!name) return;
    const key = name.toLowerCase();
    const image = safeText(row?.image || row?.image_url || row?.imageUrl || "");
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, { name, image });
      return;
    }
    if (!prev.image && image) {
      byName.set(key, { ...prev, image });
    }
  });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function productVendorId(row) {
  return safeText(row?.mart_partner_id || row?.martId || row?.mart_id);
}

function parseVisibleColumns(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((x) => safeText(x)).filter(Boolean)));
  }
  const raw = safeText(value);
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((x) => safeText(x)).filter(Boolean)));
      }
    } catch {
      // Fall back to CSV parsing.
    }
  }
  return Array.from(new Set(raw.split(",").map((x) => safeText(x)).filter(Boolean)));
}

async function uploadAdminImage(file, vendorId) {
  const normalizedVendorId = safeText(vendorId) || "vendor";
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", `images/mart-vendor/${normalizedVendorId}`);
      const payload = await adminApiForm("/api/admin/upload-image", {
        method: "POST",
        body: formData
      });
      const url = safeText(payload?.url || payload?.path || "");
      if (!url) throw new Error("UPLOAD_FAILED");
      return url;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(safeText(lastError?.message || lastError || "Image upload failed."));
}

export default function MartVendorAdminWorkspace({ http, onHeaderContentChange, onOpenCategoryImages }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [inventoryColumnsField, setInventoryColumnsField] = useState("");
  const [customCategoriesField, setCustomCategoriesField] = useState("");
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState(null);
  const [savingColumns, setSavingColumns] = useState(false);

  const loadSnapshot = async (preferredVendorId = "", options = {}) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError("");
    try {
      const snapshot = await http("/api/admin/supabase/snapshot?tables=ev_mart_partners,ev_mart_products");
      const partnerTable = Array.isArray(snapshot?.tables)
        ? snapshot.tables.find((table) => safeText(table?.name) === "ev_mart_partners")
        : null;
      const productTable = Array.isArray(snapshot?.tables)
        ? snapshot.tables.find((table) => safeText(table?.name) === "ev_mart_products")
        : null;
      const nextVendors = (Array.isArray(partnerTable?.rows) ? partnerTable.rows : [])
        .slice()
        .sort((a, b) => {
          const an = safeText(a?.name || a?.vendor_name || a?.title || a?.id);
          const bn = safeText(b?.name || b?.vendor_name || b?.title || b?.id);
          return an.localeCompare(bn);
        });
      const partnerColumns = Array.isArray(partnerTable?.columns) ? partnerTable.columns.map((column) => safeText(column?.name)).filter(Boolean) : [];
      const nextInventoryColumnsField = [
        "inventory_visible_columns",
        "inventory_columns",
        "visible_columns",
        "vendor_columns"
      ].find((field) => partnerColumns.includes(field)) || "";
      const nextCustomCategoriesField = [
        "inventory_custom_categories",
        "custom_categories",
        "category_options",
        "categories"
      ].find((field) => partnerColumns.includes(field)) || "";
      const nextProducts = Array.isArray(productTable?.rows) ? productTable.rows : [];
      setVendors(nextVendors);
      setAllProducts(nextProducts);
      setInventoryColumnsField(nextInventoryColumnsField);
      setCustomCategoriesField(nextCustomCategoriesField);
      setSelectedVendorId((current) => {
        const requested = safeText(preferredVendorId || current);
        if (requested && nextVendors.some((vendor) => safeText(vendor?.id) === requested)) return requested;
        return safeText(nextVendors[0]?.id || "");
      });
    } catch (err) {
      setError(String(err?.message || err || "Could not load mart vendors."));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => safeText(vendor?.id) === safeText(selectedVendorId)) || null,
    [vendors, selectedVendorId]
  );

  const selectedProducts = useMemo(
    () => allProducts.filter((row) => productVendorId(row) === safeText(selectedVendorId)),
    [allProducts, selectedVendorId]
  );

  const exportProductsCsv = () => {
    const vendorLabel = safeText(selectedVendor?.name || selectedVendor?.vendor_name || selectedVendor?.title || selectedVendorId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mart-vendor";
    downloadCsv(`mart-products-${vendorLabel}.csv`, selectedProducts);
  };

  const catalogProducts = useMemo(
    () => buildCatalogProducts(allProducts),
    [allProducts]
  );

  const selectedVisibleColumns = useMemo(() => {
    if (Array.isArray(pendingVisibleColumns) && pendingVisibleColumns.length) {
      return pendingVisibleColumns;
    }
    const fallback = INVENTORY_COLUMN_OPTIONS.map((option) => option.key);
    if (!selectedVendor) return fallback;
    const raw =
      selectedVendor?.inventory_visible_columns ??
      selectedVendor?.inventory_columns ??
      selectedVendor?.visible_columns ??
      selectedVendor?.vendor_columns;
    const parsed = parseVisibleColumns(raw).filter((key) => INVENTORY_COLUMN_OPTIONS.some((option) => option.key === key));
    const base = parsed.length ? parsed : fallback;
    const normalized = [...base];
    if (!normalized.includes("image_upload")) normalized.unshift("image_upload");
    if (!normalized.includes("product")) normalized.splice(Math.min(normalized.length, 1), 0, "product");
    if (!normalized.includes("description")) normalized.splice(Math.min(normalized.length, 2), 0, "description");
    return normalized;
  }, [selectedVendor, pendingVisibleColumns]);

  useEffect(() => {
    if (typeof onHeaderContentChange !== "function") return undefined;
    onHeaderContentChange(
      <div className="mv-page-header">
        <div className="mv-page-header-select">
          <select
            className="input"
            value={selectedVendorId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedVendorId(nextId);
              loadSnapshot(nextId, { silent: true });
            }}
            disabled={loading || !vendors.length}
          >
            <option value="">{loading ? "Loading vendors..." : "Select mart vendor"}</option>
            {vendors.map((vendor) => {
              const vendorId = safeText(vendor?.id);
              const vendorLabel = safeText(vendor?.name || vendor?.vendor_name || vendor?.title || vendorId);
              return <option key={vendorId} value={vendorId}>{vendorLabel}</option>;
            })}
          </select>
        </div>
        <div className="mini-row">
          <button
            className="btn small"
            type="button"
            onClick={exportProductsCsv}
            disabled={!selectedProducts.length}
          >
            Export CSV
          </button>
        </div>
      </div>
    );
    return () => onHeaderContentChange(null);
  }, [onHeaderContentChange, selectedVendor, selectedVendorId, selectedProducts, vendors, loading]);

  const upsertRows = async (rows) => {
    const vendorId = safeText(selectedVendorId);
    if (!vendorId) throw new Error("Select a mart vendor first.");
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => ({
      ...row,
      mart_partner_id: vendorId
    }));
    const response = await http("/api/admin/supabase/upsert", {
      method: "POST",
      body: JSON.stringify({
        table: "ev_mart_products",
        rows: normalizedRows
      })
    });
    await loadSnapshot(vendorId, { silent: true });
    return Array.isArray(response?.rows) && response.rows.length ? response.rows : normalizedRows;
  };

  const deleteProduct = async (id) => {
    const vendorId = safeText(selectedVendorId);
    if (!vendorId) throw new Error("Select a mart vendor first.");
    await http("/api/admin/supabase/delete", {
      method: "POST",
      body: JSON.stringify({
        table: "ev_mart_products",
        id,
        keyColumn: "id",
        confirmText: "DELETE"
      })
    });
    await loadSnapshot(vendorId, { silent: true });
  };

  const bulkDeleteProducts = async (rows) => {
    const vendorId = safeText(selectedVendorId);
    if (!vendorId) throw new Error("Select a mart vendor first.");
    const items = Array.isArray(rows) ? rows : [];
    await Promise.all(items.map((row) => http("/api/admin/supabase/delete", {
      method: "POST",
      body: JSON.stringify({
        table: "ev_mart_products",
        id: safeText(row?.id),
        keyColumn: "id",
        confirmText: "DELETE"
      })
    })));
    await loadSnapshot(vendorId, { silent: true });
  };

  const saveCustomCategories = async (categories) => {
    const vendorId = safeText(selectedVendorId);
    if (!vendorId || !selectedVendor) throw new Error("Select a mart vendor first.");
    if (!customCategoriesField) {
      const normalized = Array.isArray(categories)
        ? Array.from(new Set(categories.map((item) => safeText(item)).filter(Boolean)))
        : [];
      setVendors((prev) => prev.map((vendor) => (
        safeText(vendor?.id) === vendorId
          ? { ...vendor, custom_categories: normalized }
          : vendor
      )));
      return normalized;
    }
    await http("/api/admin/supabase/upsert", {
      method: "POST",
      body: JSON.stringify({
        table: "ev_mart_partners",
        rows: [{
          ...selectedVendor,
          id: vendorId,
          [customCategoriesField]: Array.isArray(categories) ? categories : []
        }]
      })
    });
    await loadSnapshot(vendorId, { silent: true });
  };

  const toggleVisibleColumn = async (columnKey) => {
    const vendorId = safeText(selectedVendorId);
    if (!vendorId || !selectedVendor) {
      setError("Select a mart vendor first.");
      return;
    }
    if (!inventoryColumnsField) {
      setError("Add `inventory_visible_columns` to the mart partners table to use custom columns.");
      return;
    }
    const current = selectedVisibleColumns;
    const next = current.includes(columnKey)
      ? current.filter((key) => key !== columnKey)
      : [...current, columnKey];
    const safeNext = next.length ? next : INVENTORY_COLUMN_OPTIONS.map((option) => option.key);
    setError("");
    setPendingVisibleColumns(safeNext);
    setSavingColumns(true);
    setVendors((prev) => prev.map((vendor) => (
      safeText(vendor?.id) === vendorId
        ? { ...vendor, [inventoryColumnsField]: safeNext }
        : vendor
    )));
    try {
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({
          table: "ev_mart_partners",
          rows: [{
            ...selectedVendor,
            id: vendorId,
            [inventoryColumnsField]: safeNext
          }]
        })
      });
      setPendingVisibleColumns(null);
    } catch (err) {
      setPendingVisibleColumns(null);
      setError(String(err?.message || err || "Could not save custom columns."));
      await loadSnapshot(vendorId, { silent: true });
      return;
    } finally {
      setSavingColumns(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MartVendorPortal
        mode="admin"
        vendor={selectedVendor}
        products={selectedProducts}
        catalogProducts={catalogProducts}
        loading={loading}
        adminBannerError={error}
        onOpenColumnsDialog={() => setColumnsDialogOpen(true)}
        onOpenCategoryImages={onOpenCategoryImages}
        onUpsertRows={upsertRows}
        onSaveCustomCategories={saveCustomCategories}
        onDeleteProduct={deleteProduct}
        onBulkDeleteProducts={bulkDeleteProducts}
        onUploadImage={(file) => uploadAdminImage(file, selectedVendorId)}
      />
      {columnsDialogOpen ? (
        <div className="mv-modal-backdrop" onClick={() => setColumnsDialogOpen(false)}>
          <div className="mv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-head">
              <div>Custom Columns</div>
              <button className="mv-btn small" type="button" onClick={() => setColumnsDialogOpen(false)}>Close</button>
            </div>
            <div className="small" style={{ color: "#4d6156", marginBottom: 12 }}>
              Choose which columns appear in the mart vendor inventory table.
            </div>
            {savingColumns ? (
              <div className="small" style={{ color: "#4d6156", marginBottom: 12 }}>
                Saving column changes...
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 10 }}>
              {INVENTORY_COLUMN_OPTIONS.map((option) => (
                <label key={option.key} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "#355246" }}>
                  <input
                    type="checkbox"
                    checked={selectedVisibleColumns.includes(option.key)}
                    onChange={() => toggleVisibleColumn(option.key)}
                    disabled={!selectedVendor || !inventoryColumnsField}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

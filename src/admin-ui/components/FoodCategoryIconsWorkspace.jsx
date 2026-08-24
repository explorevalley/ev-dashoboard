import React, { useEffect, useMemo, useState } from "react";

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function resolveAdminAssetUrl(value) {
  const raw = safeText(value).trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

function parseCategoryImageFromTags(value) {
  const raw = Array.isArray(value) ? value.join(",") : safeText(value);
  const m = raw.match(/catimage:([^\s,}"]+)/);
  return m ? m[1] : "";
}

function withCategoryImageInTags(value, imageUrl) {
  const isArrayInput = Array.isArray(value);
  const raw = safeText(value).trim();
  let list = [];
  if (isArrayInput) {
    list = value.map((x) => safeText(x).trim()).filter(Boolean);
  } else if (raw.startsWith("{") && raw.endsWith("}")) {
    list = raw.slice(1, -1).split(",").map((x) => x.replace(/^"+|"+$/g, "").trim()).filter(Boolean);
  } else if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed.map((x) => safeText(x).trim()).filter(Boolean) : [];
    } catch {
      list = raw.split(",").map((x) => x.trim()).filter(Boolean);
    }
  } else {
    list = raw.split(",").map((x) => x.trim()).filter(Boolean);
  }
  const noImageToken = list.filter((x) => !/^"?\{?catimage:[^},"\s]+\}?"?$/.test(x));
  const clean = safeText(imageUrl).trim();
  if (clean) noImageToken.push(`catimage:${clean}`);
  if (isArrayInput) return noImageToken;
  if (raw.startsWith("{") && raw.endsWith("}")) return `{${noImageToken.join(",")}}`;
  if (raw.startsWith("[") && raw.endsWith("]")) return JSON.stringify(noImageToken);
  return noImageToken.join(",");
}

export default function FoodCategoryIconsWorkspace({
  snapshot,
  TABLES,
  onUpsert,
  onPatch,
  onReload,
  adminApiForm
}) {
  const productsTable = useMemo(
    () => (snapshot?.tables || []).find((x) => x.name === TABLES.PRODUCTS) || null,
    [snapshot, TABLES.PRODUCTS]
  );
  const productRows = Array.isArray(productsTable?.rows) ? productsTable.rows : [];
  const productColumns = Array.isArray(productsTable?.columns)
    ? productsTable.columns.map((c) => safeText(c?.name)).filter(Boolean)
    : [];
  const hasCategoryImageColumn = productColumns.includes("category_image") || productColumns.includes("categoryImage");
  const hasTagsColumn = productColumns.includes("tags");

  const categories = useMemo(() => {
    const map = new Map();
    productRows.forEach((row) => {
      const categoryId = safeText(row?.category_id || row?.categoryId).trim();
      if (!categoryId) return;
      const prev = map.get(categoryId) || { categoryId, count: 0, image: "" };
      const image = safeText(
        row?.category_image || row?.categoryImage || parseCategoryImageFromTags(row?.tags)
      ).trim() || prev.image || "";
      map.set(categoryId, { categoryId, count: prev.count + 1, image });
    });
    return Array.from(map.values()).sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  }, [productRows]);

  const [imageEdits, setImageEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [categoryEdits, setCategoryEdits] = useState({});
  const autosaveTimersRef = React.useRef(new Map());

  useEffect(() => {
    const nextImages = {};
    const nextCategoryEdits = {};
    categories.forEach((c) => {
      nextImages[c.categoryId] = safeText(c.image || "");
      nextCategoryEdits[c.categoryId] = safeText(c.categoryId || "");
    });
    setImageEdits(nextImages);
    setCategoryEdits(nextCategoryEdits);
  }, [categories]);

  useEffect(() => () => {
    autosaveTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    autosaveTimersRef.current.clear();
  }, []);

  const saveCategory = async (categoryId, overrides = {}) => {
    const imageUrl = safeText(overrides.imageUrl ?? imageEdits[categoryId] ?? "").trim();
    const nextCategoryId = safeText(overrides.nextCategoryId ?? categoryEdits[categoryId] ?? categoryId).trim() || "uncategorized";
    const rows = productRows.filter((r) => safeText(r?.category_id || r?.categoryId).trim() === categoryId);
    if (!rows.length) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      // Renaming a category (or setting its image) legitimately touches every
      // product in it, but only its category columns. `name` used to ride
      // along in the payload, so a stale snapshot name overwrote a product
      // rename made in the meantime.
      const targets = rows
        .map((row) => {
          const id = safeText(row?.id || "");
          if (!id) return null;
          const tags = withCategoryImageInTags(row?.tags, imageUrl);
          const category = nextCategoryId || safeText(row?.category_id || row?.categoryId || categoryId || "");
          return {
            id,
            patch: {
              category_id: category || "uncategorized",
              ...(hasTagsColumn ? { tags } : {}),
              ...(hasCategoryImageColumn ? { category_image: imageUrl } : {})
            }
          };
        })
        .filter(Boolean);
      if (!targets.length) return;
      if (onPatch) {
        for (const target of targets) {
          await onPatch(TABLES.PRODUCTS, target.id, target.patch);
        }
      } else {
        await onUpsert(TABLES.PRODUCTS, targets.map((t) => ({ id: t.id, ...t.patch })));
      }
      await onReload();
      setMsg(categoryId === nextCategoryId
        ? `Autosaved category "${nextCategoryId}".`
        : `Renamed category "${categoryId}" to "${nextCategoryId}".`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const scheduleCategoryAutosave = (categoryId, nextCategoryId) => {
    const key = safeText(categoryId);
    const existing = autosaveTimersRef.current.get(key);
    if (existing) window.clearTimeout(existing);
    const timeoutId = window.setTimeout(() => {
      saveCategory(key, { nextCategoryId });
      autosaveTimersRef.current.delete(key);
    }, 600);
    autosaveTimersRef.current.set(key, timeoutId);
  };

  const handleCategoryNameChange = (categoryId, value) => {
    setCategoryEdits((prev) => ({ ...prev, [categoryId]: value }));
    setErr("");
    setMsg("");
    const trimmed = safeText(value).trim();
    if (!trimmed) return;
    scheduleCategoryAutosave(categoryId, trimmed);
  };

  const deleteCategory = async (categoryId) => {
    const rows = productRows.filter((r) => safeText(r?.category_id || r?.categoryId).trim() === categoryId);
    if (!rows.length) return;
    const ok = window.confirm(`Move all products from "${categoryId}" to "uncategorized"?`);
    if (!ok) return;
    const existing = autosaveTimersRef.current.get(categoryId);
    if (existing) {
      window.clearTimeout(existing);
      autosaveTimersRef.current.delete(categoryId);
    }
    setCategoryEdits((prev) => ({ ...prev, [categoryId]: "uncategorized" }));
    await saveCategory(categoryId, { nextCategoryId: "uncategorized", imageUrl: "" });
  };

  const uploadCategoryImage = async (categoryId, file) => {
    if (!adminApiForm) {
      setErr("Image upload unavailable: adminApiForm not provided.");
      return;
    }
    if (!file || !categoryId) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/categories");
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      const url = safeText(j?.url || j?.publicUrl || j?.signedUrl || j?.path || "").trim();
      if (!url) throw new Error("UPLOAD_FAILED");
      setImageEdits((prev) => ({ ...prev, [categoryId]: url }));
      await saveCategory(categoryId, { imageUrl: url });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="row mb-8">
        <h3 className="m-0">Category Images</h3>
      </div>
      <div className="small mb-8">
        Set one image per food/mart category. This updates all products in that category.
      </div>
      {err ? <div className="warn mb-8">{err}</div> : null}
      {msg ? <div className="small mb-8">{msg}</div> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Items</th>
              <th>Category Image</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.categoryId}>
                <td>
                  <input
                    className="input"
                    value={safeText(categoryEdits[c.categoryId] ?? c.categoryId)}
                    onChange={(e) => handleCategoryNameChange(c.categoryId, e.target.value)}
                    placeholder="Category name"
                  />
                </td>
                <td>{c.count}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {safeText(imageEdits[c.categoryId] || c.image || "") ? (
                      <img
                        src={resolveAdminAssetUrl(imageEdits[c.categoryId] || c.image || "")}
                        alt="category"
                        style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 8, border: "1px dashed #cbd5e1", background: "#f8fafc", flexShrink: 0 }} />
                    )}
                    <label className="btn small pointer">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden-input"
                        onChange={async (e) => {
                          await uploadCategoryImage(c.categoryId, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </td>
                <td>
                  <button className="btn small" onClick={() => deleteCategory(c.categoryId)} disabled={busy}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!categories.length ? <tr><td colSpan={4} className="small">No categories found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

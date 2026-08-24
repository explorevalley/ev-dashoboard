import React, { useEffect, useMemo, useState } from "react";
import * as FiIcons from "react-icons/fi";
import * as FaIcons from "react-icons/fa";

const ICON_OPTIONS = Array.from(
  new Set([
    ...Object.keys(FiIcons).filter((k) => /^Fi[A-Z][A-Za-z0-9]*$/.test(k)),
    ...Object.keys(FaIcons).filter((k) => /^Fa[A-Z][A-Za-z0-9]*$/.test(k))
  ])
).sort((a, b) => a.localeCompare(b));

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function sanitizeIconName(value, fallback = "FiGrid") {
  const icon = safeText(value).trim();
  if (!icon) return fallback;
  if (!/^(Fi|Fa)[A-Z][A-Za-z0-9]*$/.test(icon)) return fallback;
  return icon;
}

function numericOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function iconComponentByName(name) {
  const icon = sanitizeIconName(name, "FiGrid");
  if (icon.startsWith("Fa") && FaIcons[icon]) return FaIcons[icon];
  if (icon.startsWith("Fi") && FiIcons[icon]) return FiIcons[icon];
  return FiIcons.FiGrid;
}

function parseCategoryIconFromTags(value) {
  const raw = Array.isArray(value) ? value.join(",") : safeText(value);
  const m = raw.match(/caticon:(Fi|Fa)[A-Z][A-Za-z0-9]*/);
  return m ? m[0].slice("caticon:".length) : "";
}

function withCategoryIconInTags(value, iconName) {
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
  const noIconToken = list.filter((x) => !/^"?\{?caticon:(Fi|Fa)[A-Z][A-Za-z0-9]*\}?"?$/.test(x));
  const icon = sanitizeIconName(iconName || "", "");
  if (icon) noIconToken.push(`caticon:${icon}`);
  if (isArrayInput) return noIconToken;
  if (raw.startsWith("{") && raw.endsWith("}")) return `{${noIconToken.join(",")}}`;
  if (raw.startsWith("[") && raw.endsWith("]")) return JSON.stringify(noIconToken);
  return noIconToken.join(",");
}

export default function FoodMenuIconsWorkspace({
  snapshot,
  TABLES,
  onUpsert,
  onPatch,
  onReload
}) {
  const menuTable = useMemo(
    () => (snapshot?.tables || []).find((x) => x.name === TABLES.MENU_ITEMS) || null,
    [snapshot, TABLES.MENU_ITEMS]
  );
  const menuRows = Array.isArray(menuTable?.rows) ? menuTable.rows : [];
  const menuColumns = Array.isArray(menuTable?.columns)
    ? menuTable.columns.map((c) => safeText(c?.name)).filter(Boolean)
    : [];
  const hasCategoryIconColumn = menuColumns.includes("category_icon") || menuColumns.includes("categoryIcon");

  const categories = useMemo(() => {
    const map = new Map();
    menuRows.forEach((row) => {
      const category = safeText(row?.category || "General").trim() || "General";
      const prev = map.get(category) || { category, count: 0, icon: "FiGrid" };
      const icon = sanitizeIconName(
        row?.category_icon || row?.categoryIcon || parseCategoryIconFromTags(row?.tags),
        prev.icon || "FiGrid"
      );
      map.set(category, { category, count: prev.count + 1, icon });
    });
    return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [menuRows]);

  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [galleryQuery, setGalleryQuery] = useState("");
  const [pickedIconName, setPickedIconName] = useState("");

  useEffect(() => {
    const next = {};
    categories.forEach((c) => {
      next[c.category] = c.icon || "FiGrid";
    });
    setEdits(next);
    if (!activeCategory && categories[0]?.category) {
      setActiveCategory(categories[0].category);
    }
  }, [categories]);

  const filteredIcons = useMemo(() => {
    const q = safeText(galleryQuery).trim().toLowerCase();
    if (!q) return ICON_OPTIONS;
    return ICON_OPTIONS.filter((x) => x.toLowerCase().includes(q));
  }, [galleryQuery]);

  const saveCategory = async (category) => {
    const icon = sanitizeIconName(edits[category] || "FiGrid", "FiGrid");
    const rows = menuRows.filter((r) => safeText(r?.category || "General").trim() === category);
    if (!rows.length) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      // Setting a category's icon changes the icon. It must not also write
      // back price, stock, availability, veg flag, add-ons or variants: those
      // came from the last snapshot, and rewriting them reverts anything a
      // vendor changed since. Patch the two columns this action owns.
      const targets = rows
        .map((row) => {
          const id = safeText(row?.id || "");
          const restaurantId = safeText(row?.restaurant_id || row?.restaurantId || "");
          if (!id || !restaurantId) return null;
          return {
            id,
            restaurantId,
            patch: {
              tags: withCategoryIconInTags(row?.tags, icon),
              ...(hasCategoryIconColumn ? { category_icon: icon } : {})
            }
          };
        })
        .filter(Boolean);
      if (!targets.length) throw new Error("No valid menu rows with id/restaurant_id found.");
      if (onPatch) {
        for (const target of targets) {
          await onPatch(TABLES.MENU_ITEMS, target.id, target.patch, "id", { restaurantId: target.restaurantId });
        }
      } else {
        await onUpsert(TABLES.MENU_ITEMS, targets.map((t) => ({ id: t.id, restaurant_id: t.restaurantId, ...t.patch })));
      }
      await onReload();
      setMsg(`Saved icon ${icon} for menu category "${category}".`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="row mb-8">
        <h3 className="m-0">Food Menu Icons</h3>
      </div>
      <div className="small mb-8">
        Set one icon per food menu category. This updates all menu items in that category.
      </div>
      {err ? <div className="warn mb-8">{err}</div> : null}
      {msg ? <div className="small mb-8">{msg}</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Items</th>
              <th>Icon</th>
              <th>Icon Image</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.category}
                onClick={() => setActiveCategory(c.category)}
                style={{ background: activeCategory === c.category ? "rgba(126, 217, 87,0.06)" : undefined }}
              >
                <td>{c.category}</td>
                <td>{c.count}</td>
                <td>
                  <input
                    className="input"
                    value={safeText(edits[c.category] || c.icon || "FiGrid")}
                    onChange={(e) => setEdits((prev) => ({
                      ...prev,
                      [c.category]: e.target.value
                    }))}
                    list="food-menu-icon-options"
                    placeholder="Type to filter icons (Fi..., Fa...)"
                  />
                </td>
                <td>
                  {(() => {
                    const IconComp = iconComponentByName(edits[c.category] || c.icon || "FiGrid");
                    return <IconComp size={18} color="#7ED957" />;
                  })()}
                </td>
                <td>
                  <button className="btn small primary" onClick={() => saveCategory(c.category)} disabled={busy}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {!categories.length ? <tr><td colSpan={5} className="small">No menu categories found.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="field mt-10">
        <label>Icon Gallery</label>
        <div className="small mb-6">
          {activeCategory
            ? `Selected category: ${activeCategory}`
            : "Select a category row first, then click an icon below."}
        </div>
        <input
          className="input mb-6"
          value={galleryQuery}
          onChange={(e) => setGalleryQuery(e.target.value)}
          placeholder="Filter icons by name..."
        />
        <div className="chip-wrap">
          {filteredIcons.map((name) => {
            const IconComp = iconComponentByName(name);
            const active = pickedIconName === name;
            return (
              <button
                key={name}
                type="button"
                className="btn small"
                style={{ borderColor: active ? "#7ED957" : undefined, background: active ? "rgba(126, 217, 87,0.10)" : undefined }}
                onClick={() => {
                  setPickedIconName(name);
                  if (activeCategory) {
                    setEdits((prev) => ({ ...prev, [activeCategory]: name }));
                  }
                }}
                title={name}
              >
                <IconComp size={14} color="#7ED957" />
              </button>
            );
          })}
          {!filteredIcons.length ? <span className="small">No icons match filter.</span> : null}
        </div>
        {pickedIconName ? <div className="small mt-6">Selected icon: {pickedIconName}</div> : null}
      </div>

      <datalist id="food-menu-icon-options">
        {ICON_OPTIONS.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </div>
  );
}

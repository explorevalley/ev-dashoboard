import React, { useEffect, useMemo, useState } from "react";
import { downloadCsv } from "./csvExport";

/** A vendor's delivery-zone tags, whichever spelling the row was saved with. */
function zonesOf(vendor) {
  const raw = Array.isArray(vendor?.delivery_zones)
    ? vendor.delivery_zones
    : Array.isArray(vendor?.deliveryZones)
      ? vendor.deliveryZones
      : [];
  return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/**
 * Splits the comma-separated field into tags, deduped case-insensitively.
 *
 * The app builds its place filter from the distinct tags across every vendor, so
 * "Kullu" and "kullu " saved separately would show the shopper the same town
 * twice and split its restaurants between the two.
 */
function splitZones(csv) {
  const seen = new Set();
  const out = [];
  String(csv ?? "").split(",").forEach((part) => {
    const zone = part.trim();
    if (!zone) return;
    const key = zone.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(zone);
  });
  return out;
}

export default function FoodVendorsWorkspace({ snapshot, onReload, onOpenImages, onUpsert, onUpsertPartial, onPatch, onDelete, TABLES, PAGE_SIZE, Pagination, safeText, extractImageUrlsFromRow, adminApiForm, http }) {
  const restaurants = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.RESTAURANTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);
  const menuItems = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.MENU_ITEMS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);
  /**
   * Every delivery zone already tagged on some vendor, offered as one-tap chips.
   * Retyping a town by hand is how "Bhuntar" and "bhuntar" end up as two
   * separate entries in the app's place filter.
   */
  const knownZones = useMemo(() => {
    const byKey = new Map();
    restaurants.forEach((row) => {
      zonesOf(row).forEach((zone) => {
        const key = zone.toLowerCase();
        const entry = byKey.get(key);
        if (entry) entry.count += 1;
        else byKey.set(key, { zone, count: 1 });
      });
    });
    return Array.from(byKey.values()).sort((a, b) => a.zone.localeCompare(b.zone));
  }, [restaurants]);

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorId, setVendorId] = useState(restaurants[0]?.id || "");
  const [vendorMode, setVendorMode] = useState("edit"); // edit | new
  const [menuQuery, setMenuQuery] = useState("");
  const [menuTab, setMenuTab] = useState("items");
  const [vendorDraft, setVendorDraft] = useState({
    id: "",
    name: "",
    phone: "",
    location: "",
    gstin: "",
    offer: "",
    description: "",
    cuisineCsv: "",
    deliveryZonesCsv: "",
    heroImage: "",
    username: "",
    password: "",
    available: true
  });
  const [menuJson, setMenuJson] = useState("[]");
  const [menuJsonDirty, setMenuJsonDirty] = useState(false);
  const [menuItemDrafts, setMenuItemDrafts] = useState({});
  // Universal markup: MRP is auto-derived as this many percent above the price.
  // Defaults to 10% and can be increased/decreased for the whole vendor menu.
  const [mrpMarkupPercent, setMrpMarkupPercent] = useState("10");
  // Universal bulk price adjuster: shift every item's price up/down by this percent.
  const [priceAdjustPercent, setPriceAdjustPercent] = useState("10");
  const [uploadedMenuImageUrl, setUploadedMenuImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /**
   * Result of the last save, shown inside the editor dialog.
   *
   * The workspace's error line sits behind the dialog backdrop, so a failed
   * save used to be completely silent: the admin edited a field, pressed Save,
   * and nothing on screen changed either way.
   */
  const [vendorNotice, setVendorNotice] = useState("");
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [deleteVendorTarget, setDeleteVendorTarget] = useState(null);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState(null);

  useEffect(() => {
    if (!vendorId && restaurants[0]?.id) setVendorId(restaurants[0].id);
  }, [restaurants?.length]);

  const filteredVendors = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [restaurants, vendorQuery]);

  const vendor = useMemo(() => restaurants.find((r) => String(r.id) === String(vendorId)) || null, [restaurants, vendorId]);

  const vendorAllItems = useMemo(() => {
    const rid = String(vendorId || "");
    return menuItems
      .filter((m) => String(m.restaurant_id || "") === rid)
      .slice()
      .sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")) || String(a.name || "").localeCompare(String(b.name || "")));
  }, [menuItems, vendorId]);

  // Rows whose SAVED MRP is still missing (or below the vendor price). The grid
  // shows a derived MRP for these, but until they are saved the customer app
  // has nothing to quote but the vendor's own price.
  const unsavedMrpCount = useMemo(
    () =>
      vendorAllItems.filter((item) => {
        const price = Math.max(0, Number(item?.price || 0) || 0);
        if (price <= 0) return false;
        return Math.max(0, Number(item?.mrp || 0) || 0) < price;
      }).length,
    [vendorAllItems]
  );

  const vendorItems = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return q ? vendorAllItems.filter((m) => JSON.stringify(m).toLowerCase().includes(q)) : vendorAllItems;
  }, [vendorAllItems, menuQuery]);
  const [menuPage, setMenuPage] = useState(1);
  const pagedVendorItems = useMemo(
    () => vendorItems.slice((menuPage - 1) * PAGE_SIZE, menuPage * PAGE_SIZE),
    [vendorItems, menuPage, PAGE_SIZE]
  );
  useEffect(() => {
    setMenuPage(1);
    setUploadedMenuImageUrl("");
  }, [menuQuery, vendorId]);

  useEffect(() => {
    setMenuTab("items");
    setMenuJsonDirty(false);
  }, [vendorId]);

  // MRP = price + markup%. Rounded to a whole rupee. Falls back to the price
  // itself when the percent is blank/invalid so we never produce an MRP below price.
  const computeMrpFromPrice = (price, pct = mrpMarkupPercent) => {
    const base = Math.max(0, Number(price) || 0);
    if (base <= 0) return 0;
    const markup = Number(pct);
    const safeMarkup = Number.isFinite(markup) ? markup : 0;
    return Math.round(base * (1 + safeMarkup / 100));
  };

  // The MRP a row must be SAVED with. The customer app shows and charges the
  // MRP, so a row stored with 0 (or with an MRP under the vendor price) makes
  // the menu quote the kitchen's own price instead. An explicit MRP wins;
  // otherwise the markup-derived figure the grid already displays is persisted.
  const resolveRowMrp = (mrp, price) => {
    const base = Math.max(0, Number(price) || 0);
    const explicit = Math.max(0, Number(mrp) || 0);
    if (explicit > 0) return Math.max(explicit, base);
    return computeMrpFromPrice(base);
  };

  useEffect(() => {
    const nextDrafts = {};
    vendorAllItems.forEach((item) => {
      const id = safeText(item?.id || item?.name);
      if (!id) return;
      const price = safeText(item?.price || "0");
      const savedMrp = Math.max(0, Number(item?.mrp || 0) || 0);
      // Auto-derive MRP from the price when the vendor has not stored one yet.
      const mrp = savedMrp > 0 ? savedMrp : computeMrpFromPrice(price);
      nextDrafts[id] = {
        name: safeText(item?.name || ""),
        category: safeText(item?.category || "General"),
        price,
        mrp: safeText(mrp),
        stock: safeText(item?.stock || "0")
      };
    });
    setMenuItemDrafts(nextDrafts);
  }, [vendorAllItems]);

  // Re-derive every row's MRP whenever the universal markup percent changes.
  const applyMarkupToAll = (pct) => {
    setMenuItemDrafts((prev) => {
      const next = { ...prev };
      vendorAllItems.forEach((item) => {
        const id = safeText(item?.id || item?.name);
        if (!id) return;
        const base = next[id] || {
          name: safeText(item?.name || ""),
          category: safeText(item?.category || "General"),
          price: safeText(item?.price || "0"),
          mrp: safeText(item?.mrp || "0"),
          stock: safeText(item?.stock || "0")
        };
        next[id] = { ...base, mrp: safeText(computeMrpFromPrice(base.price, pct)) };
      });
      return next;
    });
  };

  // Bulk-shift every row's price by ±percent, then re-derive MRP from the new price.
  const adjustAllPrices = (direction) => {
    const pct = Number(priceAdjustPercent);
    if (!Number.isFinite(pct) || pct <= 0) return;
    const factor = direction === "down" ? 1 - pct / 100 : 1 + pct / 100;
    setMenuItemDrafts((prev) => {
      const next = { ...prev };
      vendorAllItems.forEach((item) => {
        const id = safeText(item?.id || item?.name);
        if (!id) return;
        const base = next[id] || {
          name: safeText(item?.name || ""),
          category: safeText(item?.category || "General"),
          price: safeText(item?.price || "0"),
          mrp: safeText(item?.mrp || "0"),
          stock: safeText(item?.stock || "0")
        };
        const nextPrice = Math.max(0, Math.round((Number(base.price) || 0) * factor));
        next[id] = { ...base, price: safeText(nextPrice), mrp: safeText(computeMrpFromPrice(nextPrice)) };
      });
      return next;
    });
  };

  const liveMenuJson = useMemo(() => {
    const payload = vendorAllItems.map((item) => {
      const itemId = safeText(item?.id || item?.name);
      const draft = itemId ? menuItemDrafts[itemId] : null;
      return {
        id: safeText(item?.id || ""),
        restaurant_id: safeText(item?.restaurant_id || vendorId || ""),
        category: safeText(draft?.category ?? item?.category ?? "General"),
        name: safeText(draft?.name ?? item?.name ?? ""),
        description: safeText(item?.description || ""),
        offer: safeText(item?.offer || ""),
        price: Math.max(0, Number(draft?.price ?? item?.price ?? 0) || 0),
        mrp: resolveRowMrp(draft?.mrp ?? item?.mrp, draft?.price ?? item?.price),
        image: item?.image ?? null,
        hero_image: item?.hero_image ?? item?.image ?? null,
        available: item?.available !== false,
        is_veg: item?.is_veg === true || item?.isVeg === true,
        stock: Math.max(0, Number(draft?.stock ?? item?.stock ?? 0) || 0)
      };
    });
    return JSON.stringify(payload, null, 2);
  }, [menuItemDrafts, vendorAllItems, vendorId]);

  const vendorImages = useMemo(() => extractImageUrlsFromRow(vendor || {}), [vendorId, vendor]);

  useEffect(() => {
    if (!vendor || vendorMode === "new") return;
    setVendorMode("edit");
    setVendorNotice("");
    setVendorDraft({
      id: safeText(vendor.id || ""),
      name: safeText(vendor.name || ""),
      phone: safeText(vendor.phone || vendor.phone_number || vendor.phoneNumber || ""),
      location: safeText(vendor.location || ""),
      gstin: safeText(vendor.gstin || vendor.gst_number || vendor.gstNumber || vendor.gst_no || ""),
      offer: safeText(vendor.offer || ""),
      description: safeText(vendor.description || ""),
      cuisineCsv: Array.isArray(vendor.cuisine) ? vendor.cuisine.join(", ") : safeText(vendor.cuisine || ""),
      deliveryZonesCsv: zonesOf(vendor).join(", "),
      heroImage: safeText(vendor.hero_image || vendor.heroImage || ""),
      username: safeText(vendor.username || ""),
      password: "",
      available: vendor.available !== false
    });
  }, [vendorId, vendor?.id]);

  useEffect(() => {
    if (!menuJsonDirty) setMenuJson(liveMenuJson);
  }, [liveMenuJson, menuJsonDirty]);

  const buildVendorPayload = (overrides = {}) => ({
    ...(vendor || {}),
    id: safeText(overrides.id ?? vendorDraft.id ?? vendorId ?? vendor?.id ?? ""),
    name: safeText(overrides.name ?? vendorDraft.name ?? vendor?.name ?? ""),
    username: safeText(overrides.username ?? vendorDraft.username ?? vendor?.username ?? ""),
    password_hash: safeText(overrides.password_hash ?? vendor?.password_hash ?? vendor?.passwordHash ?? ""),
    phone: safeText(overrides.phone ?? vendorDraft.phone ?? vendor?.phone ?? vendor?.phone_number ?? vendor?.phoneNumber ?? ""),
    location: safeText(overrides.location ?? vendorDraft.location ?? vendor?.location ?? ""),
    gstin: safeText(overrides.gstin ?? vendorDraft.gstin ?? vendor?.gstin ?? vendor?.gst_number ?? vendor?.gstNumber ?? vendor?.gst_no ?? ""),
    offer: safeText(overrides.offer ?? vendorDraft.offer ?? vendor?.offer ?? ""),
    description: safeText(overrides.description ?? vendorDraft.description ?? vendor?.description ?? ""),
    cuisine: Array.isArray(overrides.cuisine)
      ? overrides.cuisine
      : vendorDraft.cuisineCsv.split(",").map((x) => x.trim()).filter(Boolean),
    // The towns this kitchen delivers to. The app's place filter reads these,
    // so a vendor with none set falls back to whatever its address parses to.
    delivery_zones: Array.isArray(overrides.delivery_zones)
      ? overrides.delivery_zones
      : splitZones(vendorDraft.deliveryZonesCsv),
    hero_image: safeText(overrides.hero_image ?? overrides.heroImage ?? vendorDraft.heroImage ?? vendor?.hero_image ?? vendor?.heroImage ?? ""),
    available: overrides.available ?? vendorDraft.available ?? vendor?.available !== false
  });

  const startNewVendor = () => {
    const newId = `vendor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setVendorNotice("");
    setVendorMode("new");
    setVendorId("");
    setVendorDialogOpen(true);
    setVendorDraft({
      id: newId,
      name: "",
      phone: "",
      location: "",
      gstin: "",
      offer: "",
      description: "",
      cuisineCsv: "",
      deliveryZonesCsv: "",
      heroImage: "",
      username: "",
      password: "",
      available: true
    });
  };

  /**
   * Drops a town from every vendor tagged with it.
   *
   * The picker is built from what other vendors already use, so a typo or a
   * street address saved as a zone keeps being offered - and stays in the app's
   * place filter - until it is cleared everywhere.
   */
  const removeZoneEverywhere = async (zone) => {
    const key = safeText(zone).toLowerCase();
    if (!key) return;
    const affected = restaurants.filter((row) => zonesOf(row).some((x) => x.toLowerCase() === key));
    setBusy(true);
    setError("");
    setVendorNotice("");
    try {
      if (affected.length) {
        const rows = affected.map((row) => {
          const next = zonesOf(row).filter((x) => x.toLowerCase() !== key);
          const patched = { ...row, delivery_zones: next };
          if (Array.isArray(row?.deliveryZones)) patched.deliveryZones = next;
          return patched;
        });
        await onUpsert(TABLES.RESTAURANTS, rows);
      }
      setVendorDraft((p) => ({
        ...p,
        deliveryZonesCsv: splitZones(p.deliveryZonesCsv).filter((x) => x.toLowerCase() !== key).join(", ")
      }));
      await onReload();
      setVendorNotice(`Removed "${safeText(zone)}" from ${affected.length} vendor${affected.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveVendor = async () => {
    const nextId = vendorDraft.id || `vendor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    if (!vendorDraft.name.trim()) { setError("Vendor name is required"); return; }
    setBusy(true);
    setError("");
    setVendorNotice("");
    try {
      const row = buildVendorPayload({ id: nextId });
      await onUpsert(TABLES.RESTAURANTS, [row]);
      await onReload();
      setVendorId(nextId);
      setVendorMode("edit");
      const savedZones = splitZones(vendorDraft.deliveryZonesCsv);
      setVendorNotice(savedZones.length
        ? `Saved. Delivers to ${savedZones.join(", ")}.`
        : "Saved. No delivery towns set, so the app files this vendor under whatever its address parses to.");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const setVendorAvailability = async (vendor, nextAvailable) => {
    const id = safeText(vendor?.id);
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      // Only the availability flag. Spreading the whole vendor back in meant
      // flipping "Available" also rewrote its address, phone, offer and menu
      // blob from the last snapshot.
      if (onPatch) {
        await onPatch(TABLES.RESTAURANTS, id, { available: nextAvailable });
      } else {
        await onUpsert(TABLES.RESTAURANTS, [{ ...vendor, id, available: nextAvailable }]);
      }
      // Keep the open editor in step when it is showing this same vendor.
      if (String(id) === String(vendorId)) {
        setVendorDraft((prev) => ({ ...prev, available: nextAvailable }));
      }
      await onReload();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const toggleVendorAvailability = async () => {
    const nextAvailable = !vendorDraft.available;
    setVendorDraft((prev) => ({ ...prev, available: nextAvailable }));
    if (vendorMode === "new" || !(vendorDraft.id || vendorId)) return;
    setBusy(true);
    setError("");
    try {
      const row = buildVendorPayload({ available: nextAvailable });
      await onUpsert(TABLES.RESTAURANTS, [row]);
      await onReload();
    } catch (e) {
      setVendorDraft((prev) => ({ ...prev, available: !nextAvailable }));
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveVendorCredentials = async () => {
    const rid = safeText(vendorDraft.id || vendorId);
    const username = safeText(vendorDraft.username).toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const password = safeText(vendorDraft.password);
    if (!rid) { setError("Save vendor first, then set credentials."); return; }
    if (!username) { setError("Vendor username is required."); return; }
    setBusy(true);
    setError("");
    setVendorNotice("");
    try {
      await http(`/api/admin/food-vendors/${encodeURIComponent(rid)}/credentials`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      await onReload();
      setVendorDraft((p) => ({ ...p, username, password: "" }));
      setVendorNotice("Login credentials saved.");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteVendor = async (id) => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/food-vendors/delete-vendor", {
        method: "POST",
        body: JSON.stringify({ restaurantId: id, confirmText: "DELETE_VENDOR" })
      });
      await onReload();
      if (String(vendorId) === String(id)) setVendorId("");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadVendorHero = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/food");
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      const heroImage = safeText(j?.url || j?.path || "");
      if (!heroImage) throw new Error("UPLOAD_FAILED");
      setVendorDraft((p) => ({ ...p, heroImage }));
      if (vendorMode === "edit" && safeText(vendorDraft.id || vendorId || vendor?.id)) {
        await onUpsert(TABLES.RESTAURANTS, [buildVendorPayload({ hero_image: heroImage })]);
        await onReload();
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadMenuImage = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", `images/food/menu/${safeText(vendorId || vendorDraft.id || "items")}`);
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      const url = safeText(j?.url || j?.path || "");
      if (!url) throw new Error("UPLOAD_FAILED");
      setUploadedMenuImageUrl(url);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const uploadMenuRowImage = async (item, file) => {
    if (!file || !item) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", `images/food/menu/${safeText(vendorId || vendorDraft.id || "items")}`);
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      const url = safeText(j?.url || j?.path || "");
      if (!url) throw new Error("UPLOAD_FAILED");
      // An image upload sets the image. Re-sending price/stock/availability
      // alongside it pushed stale snapshot values back over the row, and the
      // price in the payload used to make the server re-derive MRP too.
      const itemId = safeText(item?.id);
      if (onPatch && itemId) {
        await onPatch(
          TABLES.MENU_ITEMS,
          itemId,
          { image: url, hero_image: url },
          "id",
          { restaurantId: safeText(item?.restaurant_id || vendorId || "") }
        );
      } else {
        await onUpsert(TABLES.MENU_ITEMS, [{
          ...item,
          id: itemId,
          restaurant_id: safeText(item?.restaurant_id || vendorId || ""),
          category: safeText(item?.category || "General"),
          name: safeText(item?.name || ""),
          description: safeText(item?.description || ""),
          price: Number(item?.price || 0),
          image: url,
          hero_image: url,
          offer: safeText(item?.offer || ""),
          available: item?.available !== false,
          is_veg: item?.is_veg === true || item?.isVeg === true,
          stock: Math.max(0, Number(item?.stock || 0) || 0)
        }]);
      }
      await onReload();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const buildMenuItemRow = (item, draft) => ({
    ...item,
    id: safeText(item?.id),
    restaurant_id: safeText(item?.restaurant_id || vendorId || ""),
    category: safeText(draft?.category || item?.category || "General") || "General",
    name: safeText(draft?.name || ""),
    description: safeText(item?.description || ""),
    price: Math.max(0, Number(draft?.price ?? item?.price ?? 0) || 0),
    mrp: resolveRowMrp(draft?.mrp ?? item?.mrp, draft?.price ?? item?.price),
    image: item?.image ?? item?.hero_image ?? null,
    hero_image: item?.hero_image ?? item?.image ?? null,
    offer: safeText(draft?.offer ?? item?.offer ?? ""),
    // Editable now: a kitchen has to be able to 86 a dish and to correct a
    // veg/non-veg mistake without going through support.
    available: draft?.available !== undefined ? draft.available === true : item?.available !== false,
    is_veg: draft?.is_veg !== undefined ? draft.is_veg === true : (item?.is_veg === true || item?.isVeg === true),
    stock: Math.max(0, Number(draft?.stock ?? item?.stock ?? 0) || 0)
  });

  const saveMenuItemDraft = async (item, draft) => {
    const itemId = safeText(item?.id || item?.name);
    if (!item || !itemId) return false;
    const nextName = safeText(draft?.name || "");
    if (!nextName) {
      setError("Menu item name is required.");
      return false;
    }
    const row = buildMenuItemRow(item, draft);
    try {
      // Prefer the partial upsert: it persists the row AND patches the local
      // snapshot in place, avoiding a full multi-table reload after each save.
      if (onUpsertPartial) {
        await onUpsertPartial(TABLES.MENU_ITEMS, [row]);
      } else {
        await onUpsert(TABLES.MENU_ITEMS, [row]);
      }
      return true;
    } catch (e) {
      setError(String(e.message || e));
      return false;
    }
  };

  const menuFieldValue = (item, field, fallback = "") => {
    const draft = menuItemDrafts[safeText(item?.id || item?.name)];
    // Use `??` so an edited-to-empty draft value stays empty instead of snapping
    // back to the saved item value (which made the first character impossible to delete).
    return safeText(draft?.[field] ?? item?.[field] ?? fallback);
  };

  const updateMenuItemDraft = (item, field, value) => {
    const itemId = safeText(item?.id || item?.name);
    if (!itemId) return;
    setMenuItemDrafts((prev) => {
      const base = prev[itemId] || {
        name: safeText(item?.name || ""),
        category: safeText(item?.category || "General"),
        price: safeText(item?.price || "0"),
        mrp: safeText(item?.mrp || "0"),
        stock: safeText(item?.stock || "0"),
        offer: safeText(item?.offer || ""),
        // Booleans, unlike the text fields above, so they are compared and
        // written as booleans rather than through safeText().
        available: item?.available !== false,
        is_veg: item?.is_veg === true || item?.isVeg === true
      };
      const next = { ...base, [field]: value };
      // Editing the price re-derives MRP from the universal markup automatically.
      // MRP can still be overridden afterwards by editing the MRP field directly.
      if (field === "price") {
        next.mrp = safeText(computeMrpFromPrice(value));
      }
      return { ...prev, [itemId]: next };
    });
  };

  const isMenuItemDirty = (item) => {
    const itemId = safeText(item?.id || item?.name);
    const draft = itemId ? menuItemDrafts[itemId] : null;
    if (!draft) return false;
    return (
      safeText(draft.name) !== safeText(item?.name || "") ||
      safeText(draft.category || "General") !== safeText(item?.category || "General") ||
      safeText(draft.price || "0") !== safeText(item?.price || "0") ||
      safeText(draft.mrp || "0") !== safeText(item?.mrp || "0") ||
      safeText(draft.stock || "0") !== safeText(item?.stock || "0") ||
      safeText(draft.offer ?? item?.offer ?? "") !== safeText(item?.offer || "") ||
      (draft.available !== undefined && draft.available !== (item?.available !== false)) ||
      (draft.is_veg !== undefined && draft.is_veg !== (item?.is_veg === true || item?.isVeg === true))
    );
  };

  /** Current value of one of the two flags: the draft's if edited, else the saved row's. */
  const menuFlagValue = (item, field) => {
    const draft = menuItemDrafts[safeText(item?.id || item?.name)];
    if (draft && draft[field] !== undefined) return draft[field] === true;
    if (field === "available") return item?.available !== false;
    return item?.is_veg === true || item?.isVeg === true;
  };

  const saveMenuItemRow = async (item) => {
    const itemId = safeText(item?.id || item?.name);
    const draft = itemId ? menuItemDrafts[itemId] : null;
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const ok = await saveMenuItemDraft(item, draft);
      // The partial upsert already refreshed the local snapshot; only fall back to
      // a full reload when it isn't available.
      if (ok && !onUpsertPartial) await onReload();
    } finally {
      setBusy(false);
    }
  };

  // Persist every row's current draft in one batch (used by the top "Save All"
  // button after a bulk MRP/price adjustment).
  const saveAllMenuItems = async () => {
    if (!vendorId) return;
    const rows = vendorAllItems
      .map((item) => {
        const id = safeText(item?.id || item?.name);
        const draft = id ? menuItemDrafts[id] : null;
        if (!draft || !safeText(draft?.name || "")) return null;
        return buildMenuItemRow(item, draft);
      })
      .filter(Boolean);
    if (!rows.length) {
      setError("There are no menu items to save.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (onUpsertPartial) {
        await onUpsertPartial(TABLES.MENU_ITEMS, rows);
      } else {
        await onUpsert(TABLES.MENU_ITEMS, rows);
        await onReload();
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveMenuJsonReplace = async () => {
    if (!vendorId) return;
    setBusy(true);
    setError("");
    try {
      const parsed = JSON.parse(menuJson);
      const sourceItems = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : null;
      if (!sourceItems) throw new Error("JSON must be an array or an object with an items array.");
      if (!sourceItems.length) throw new Error("Add at least one menu item before saving.");
      // Normalize: id can be blank; backend will auto-generate using vendor + item name.
      const normalized = sourceItems.map((x) => ({
        id: safeText(x?.id || ""),
        restaurant_id: safeText(x?.restaurant_id || vendorId || ""),
        category: safeText(x?.category || "General"),
        name: safeText(x?.name || ""),
        description: safeText(x?.description || ""),
        offer: safeText(x?.offer || ""),
        price: Number(x?.price || 0),
        mrp: resolveRowMrp(x?.mrp, x?.price),
        image: x?.image ?? x?.hero_image ?? null,
        available: x?.available !== false,
        is_veg: x?.is_veg === true || x?.isVeg === true,
        stock: Math.max(0, Number(x?.stock || 0) || 0)
      })).filter((x) => x.name);
      if (!normalized.length) {
        throw new Error("No valid menu items found. Each item must include a non-empty name.");
      }

      await http("/api/admin/food-vendors/replace-menu", {
        method: "POST",
        body: JSON.stringify({ restaurantId: vendorId, items: normalized })
      });
      setMenuJsonDirty(false);
      await onReload();
    } catch (e) {
      console.error("[FoodVendorsWorkspace] replace-menu failed", {
        restaurantId: vendorId,
        error: e,
        message: e?.message || String(e),
        status: e?.status,
        payload: e?.payload,
      });
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Deletes exactly one row.
   *
   * This used to rebuild the vendor's entire menu and post it to
   * /replace-menu, which wipes and re-inserts every row for the restaurant.
   * One deletion therefore rewrote all the others: rows with no saved MRP came
   * back carrying a derived one, and any field the rebuild payload did not
   * list was flattened. The delete endpoint touches the single item and the
   * matching entry in the vendor's menu blobs, and nothing else.
   */
  const deleteMenuItem = async (item) => {
    if (!vendorId || !item) return;
    const itemId = safeText(item?.id || "");
    const itemName = safeText(item?.name || "");
    if (!itemId && !itemName) {
      setError("This row has no id or name, so it cannot be deleted on its own.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await http("/api/admin/food-vendors/delete-menu-item", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: vendorId,
          itemId,
          name: itemName,
          category: safeText(item?.category || "")
        })
      });
      // Drop the row's pending draft so the grid does not resurrect it as an
      // edit against an id that no longer exists.
      setMenuItemDrafts((prev) => {
        const next = { ...prev };
        delete next[itemId || itemName];
        return next;
      });
      await onReload();
    } catch (e) {
      console.error("[FoodVendorsWorkspace] delete-menu-item failed", {
        restaurantId: vendorId,
        itemId,
        error: e,
        message: e?.message || String(e),
        status: e?.status,
        payload: e?.payload,
      });
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const exportVendorsCsv = () => {
    const rows = filteredVendors.map((row) => ({
      id: safeText(row?.id),
      name: safeText(row?.name),
      username: safeText(row?.username),
      phone: safeText(row?.phone || row?.phone_number || row?.phoneNumber),
      location: safeText(row?.location),
      gstin: safeText(row?.gstin || row?.gst_number || row?.gstNumber || row?.gst_no),
      offer: safeText(row?.offer),
      description: safeText(row?.description),
      cuisine: Array.isArray(row?.cuisine) ? row.cuisine.join(" | ") : safeText(row?.cuisine),
      hero_image: safeText(row?.hero_image || row?.heroImage),
      available: row?.available !== false ? "true" : "false"
    }));
    downloadCsv("food-vendors.csv", rows, ["id", "name", "username", "phone", "location", "gstin", "offer", "description", "cuisine", "hero_image", "available"]);
  };

  const exportMenuCsv = () => {
    const vendorLabel = safeText(vendor?.name || vendorId || "vendor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vendor";
    const rows = vendorItems.map((item) => ({
      id: safeText(item?.id),
      restaurant_id: safeText(item?.restaurant_id || vendorId),
      restaurant_name: safeText(vendor?.name),
      category: safeText(item?.category),
      name: safeText(item?.name),
      description: safeText(item?.description),
      offer: safeText(item?.offer),
      price: Number(item?.price || 0),
      mrp: Math.max(0, Number(item?.mrp || 0) || 0),
      stock: Math.max(0, Number(item?.stock || 0) || 0),
      available: item?.available !== false ? "true" : "false",
      is_veg: item?.is_veg === true || item?.isVeg === true ? "true" : "false",
      image: safeText(item?.image || item?.hero_image)
    }));
    downloadCsv(`food-menu-${vendorLabel}.csv`, rows, ["id", "restaurant_id", "restaurant_name", "category", "name", "description", "offer", "price", "mrp", "stock", "available", "is_veg", "image"]);
  };

  const renderVendorEditor = () => {
    const selectedZones = splitZones(vendorDraft.deliveryZonesCsv);
    const zoneIsOn = (zone) => selectedZones.some((x) => x.toLowerCase() === zone.toLowerCase());
    const setZones = (list) => setVendorDraft((p) => ({ ...p, deliveryZonesCsv: splitZones(list.join(", ")).join(", ") }));

    return (
      <div className="vendor-form">
        <section className="vendor-form-card">
          <div className="vendor-form-card-head">
            <div className="vendor-form-card-title">Vendor Frontend Preview</div>
            {(vendorMode === "edit" || vendorDraft.name || vendorDraft.id) ? (
              <button
                className={`pill-toggle ${vendorDraft.available ? "on" : ""}`}
                type="button"
                onClick={toggleVendorAvailability}
                disabled={busy}
                title={vendorDraft.available ? "Take this restaurant off the app" : "Put this restaurant back on the app"}
              >
                {vendorDraft.available ? "Available" : "Unavailable"}
              </button>
            ) : null}
          </div>
          <div className="vendor-preview">
            {vendorDraft.heroImage ? (
              <img
                className="img"
                src={vendorDraft.heroImage}
                alt=""
                onClick={() => onOpenImages(vendorDraft.name || "Vendor images", [vendorDraft.heroImage], 0)}
              />
            ) : (
              <div className="img-chip"><span>No image</span></div>
            )}
            <div className="vendor-preview-copy">
              <div className="vendor-name fs-18">{safeText(vendorDraft.name || vendorDraft.id || "New vendor")}</div>
              <div className="vendor-sub">{safeText(vendorDraft.location || "").slice(0, 60)}</div>
              {safeText(vendorDraft.phone || "") ? (
                <div className="vendor-sub">{safeText(vendorDraft.phone || "")}</div>
              ) : null}
              <div className="vendor-sub">{vendorDraft.available ? "Frontend: visible" : "Frontend: hidden"}</div>
              {safeText(vendorDraft.description || "") ? (
                <div className="vendor-preview-desc">{safeText(vendorDraft.description || "").slice(0, 180)}</div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="vendor-form-card">
          <div className="vendor-form-card-head">
            <div className="vendor-form-card-title">Vendor details</div>
          </div>
          <div className="vendor-form-grid">
            <div className="field">
              <label>Name *</label>
              <input className="input" value={vendorDraft.name} onChange={(e) => setVendorDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input className="input" value={vendorDraft.phone} onChange={(e) => setVendorDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="Vendor phone" />
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input" value={vendorDraft.location} onChange={(e) => setVendorDraft((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="field">
              <label>GST Number</label>
              <input
                className="input"
                value={vendorDraft.gstin}
                onChange={(e) => setVendorDraft((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="field">
              <label>Cuisine (comma separated)</label>
              <input className="input" value={vendorDraft.cuisineCsv} onChange={(e) => setVendorDraft((p) => ({ ...p, cuisineCsv: e.target.value }))} placeholder="North Indian, Chinese" />
            </div>
            <div className="field">
              <label>Offer</label>
              <input
                className="input"
                value={vendorDraft.offer}
                onChange={(e) => setVendorDraft((p) => ({ ...p, offer: e.target.value }))}
                placeholder="20% OFF or BUY 1 GET 1 FREE"
              />
            </div>
          </div>
        </section>

        <section className="vendor-form-card">
          <div className="vendor-form-card-head">
            <div className="vendor-form-card-title">Delivery area</div>
            <div className="small">{selectedZones.length ? `${selectedZones.length} town${selectedZones.length === 1 ? "" : "s"}` : "Falls back to address"}</div>
          </div>
          <div className="field">
            <label>Delivers to (comma separated)</label>
            <input
              className="input"
              value={vendorDraft.deliveryZonesCsv}
              onChange={(e) => setVendorDraft((p) => ({ ...p, deliveryZonesCsv: e.target.value }))}
              placeholder="Kullu, Bhuntar"
            />
            <div className="small muted">
              The towns this kitchen delivers to. The app's place filter shows the vendor under
              these and nothing else. Leave empty and it falls back to whatever its address parses to.
            </div>
          </div>
          {selectedZones.length ? (
            <div className="zone-tags">
              {selectedZones.map((zone) => (
                <span className="zone-tag" key={zone}>
                  {zone}
                  <button
                    type="button"
                    title={`Remove ${zone}`}
                    onClick={() => setZones(selectedZones.filter((x) => x.toLowerCase() !== zone.toLowerCase()))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {knownZones.length ? (
            <>
              <div className="vendor-form-hint">Tap a town already used elsewhere, or × to delete it everywhere</div>
              <div className="chip-wrap zone-chip-wrap">
                {knownZones.map(({ zone, count }) => {
                  const on = zoneIsOn(zone);
                  return (
                    <span key={zone} className={`chip zone-chip${on ? " on" : ""}`}>
                      <button
                        type="button"
                        className="zone-chip-label"
                        disabled={busy}
                        title={on ? `Remove ${zone} from this vendor` : `Add ${zone} to this vendor`}
                        onClick={() => setZones(on
                          ? selectedZones.filter((x) => x.toLowerCase() !== zone.toLowerCase())
                          : [...selectedZones, zone])}
                      >
                        {zone}
                      </button>
                      <button
                        type="button"
                        className="zone-chip-delete"
                        disabled={busy}
                        title={`Delete ${zone} from all ${count} vendor${count === 1 ? "" : "s"} using it`}
                        onClick={() => setDeleteZoneTarget({ zone, count })}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>

        <section className="vendor-form-card">
          <div className="vendor-form-card-head">
            <div className="vendor-form-card-title">Image &amp; login</div>
          </div>
          <div className="vendor-form-grid">
            <div className="field span-2">
              <label>Hero Image (URL)</label>
              <div className="flex-gap10-center">
                <input className="input flex-1" value={vendorDraft.heroImage} onChange={(e) => setVendorDraft((p) => ({ ...p, heroImage: e.target.value }))} placeholder="https://..." />
                {vendorDraft.heroImage ? (
                  <img
                    src={vendorDraft.heroImage}
                    alt="Hero thumbnail"
                    style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0", flex: "0 0 auto" }}
                  />
                ) : null}
                <label className="btn small pointer">
                  Upload
                  <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadVendorHero(e.target.files?.[0])} />
                </label>
                {vendorDraft.heroImage ? (
                  <button className="btn small" type="button" onClick={() => onOpenImages("Hero image", [vendorDraft.heroImage], 0)} disabled={busy}>Preview</button>
                ) : null}
              </div>
            </div>
            <div className="field">
              <label>Vendor Username</label>
              <input
                className="input"
                value={vendorDraft.username}
                onChange={(e) => setVendorDraft((p) => ({ ...p, username: safeText(e.target.value).toLowerCase().replace(/[^a-z0-9._-]/g, "") }))}
                placeholder="food_vendor_username"
              />
            </div>
            <div className="field">
              <label>Vendor Password {vendorDraft.username ? "(set/reset)" : ""}</label>
              <input
                className="input"
                type="password"
                value={vendorDraft.password}
                onChange={(e) => setVendorDraft((p) => ({ ...p, password: e.target.value }))}
                placeholder="Set password"
              />
            </div>
          </div>
        </section>

        <section className="vendor-form-card">
          <div className="vendor-form-card-head">
            <div className="vendor-form-card-title">Description</div>
          </div>
          <div className="field">
            <textarea className="textarea" value={vendorDraft.description} onChange={(e) => setVendorDraft((p) => ({ ...p, description: e.target.value }))} placeholder="What the app shows shoppers about this kitchen." />
          </div>
        </section>

        <div className="vendor-form-actions">
          <button className="btn primary" onClick={saveVendor} disabled={busy}>Save Vendor</button>
          <button className="btn" onClick={saveVendorCredentials} disabled={busy || vendorMode !== "edit" || !(vendorDraft.id || vendorId)}>Save Login Credentials</button>
          <button
            className="btn danger"
            onClick={() => setDeleteVendorTarget({ id: vendorDraft.id, name: safeText(vendorDraft.name || vendorDraft.id) })}
            disabled={busy || vendorMode !== "edit" || !vendorDraft.id}
          >
            Delete Vendor
          </button>
          {error ? (
            <div className="vendor-form-note is-error">{error}</div>
          ) : vendorNotice ? (
            <div className="vendor-form-note is-ok">{vendorNotice}</div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="workspace compact-workspace food-vendors-workspace">
      <div className="pane">
        <div className="pane-title">
          <div>Vendors</div>
          <div className="mini-row">
            <button className="btn small" onClick={exportVendorsCsv} disabled={!filteredVendors.length}>Export CSV</button>
            <button className="btn small" onClick={startNewVendor} disabled={busy}>+ Add</button>
          </div>
        </div>
        <input className="input" value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)} placeholder="Search vendors..." />
        <div className="list mt-10">
          {filteredVendors.map((r) => (
            <div
              key={r.id}
              className={`vendor-card ${String(r.id) === String(vendorId) ? "active" : ""}`}
              onClick={() => { setVendorId(r.id); }}
              role="button"
              tabIndex={0}
            >
              <div className="vendor-name">{safeText(r.name || "").slice(0, 60) || r.id}</div>
              <div className="vendor-sub">{safeText(r.location || "").slice(0, 40)}</div>
              <div className="vendor-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`btn small vendor-avail-btn ${r?.available === false ? "is-closed" : "is-open"}`}
                  onClick={() => setVendorAvailability(r, r?.available === false)}
                  disabled={busy}
                  title={r?.available === false
                    ? "Currently hidden from the app - tap to make it orderable again"
                    : "Currently live in the app - tap to take it off the app"}
                >
                  {r?.available === false ? "Unavailable" : "Available"}
                </button>
                <button className="btn small" onClick={() => { setVendorId(r.id); setVendorMode("edit"); setVendorDialogOpen(true); }} disabled={busy}>Edit</button>
                <button
                  className="btn small danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteVendorTarget({ id: r.id, name: safeText(r.name || r.id) });
                  }}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pane vendor-menu-pane">
        <div className="menu-grid">
          <div className="pane-title mt-2">
            <div>Vendor Menu</div>
            <div className="two-tabs mt-0">
              <button className="btn small" type="button" onClick={exportMenuCsv} disabled={!vendorItems.length}>Export CSV</button>
              <button className={`tab ${menuTab === "items" ? "active" : ""}`} type="button" onClick={() => setMenuTab("items")}>Items</button>
              <button className={`tab ${menuTab === "json" ? "active" : ""}`} type="button" onClick={() => setMenuTab("json")}>JSON</button>
            </div>
          </div>

          {error ? <div className="warn">{error}</div> : null}
          <div className={`card m-0 vendor-menu-scroll ${menuTab === "json" ? "json-editor-card" : ""}`}>
            {menuTab === "json" ? (
              <>
                <div className="small">Paste a full menu JSON array. Saving will replace this vendor's existing menu items.</div>
                <textarea
                  className="textarea json-mini json-full mt-10"
                  value={menuJson}
                  onChange={(e) => {
                    setMenuJson(e.target.value);
                    setMenuJsonDirty(true);
                  }}
                />
                <div className="mt-10 flex-gap10-wrap">
                  <button className="btn primary" onClick={saveMenuJsonReplace} disabled={busy || !vendorId}>Save JSON</button>
                </div>
                <div className="small mt-8">
                  Required fields per item: <code>name</code>. Optional: <code>id</code>, <code>category</code>, <code>description</code>, <code>offer</code>, <code>price</code>, <code>mrp</code>, <code>image</code>, <code>available</code>, <code>is_veg</code>.
                </div>
              </>
            ) : (
              <>
                <div className="row mb-8">
                  <input className="input" value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search..." />
                </div>
                <div className="row mb-8 flex-gap10-center">
                  <label className="small" style={{ whiteSpace: "nowrap" }}>MRP markup %</label>
                  <button
                    className="btn small"
                    type="button"
                    title="Decrease markup"
                    onClick={() => {
                      const next = String(Math.max(0, (Number(mrpMarkupPercent) || 0) - 1));
                      setMrpMarkupPercent(next);
                      applyMarkupToAll(next);
                    }}
                  >
                    −
                  </button>
                  <input
                    className="input"
                    style={{ maxWidth: 90, textAlign: "center" }}
                    value={mrpMarkupPercent}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^0-9.]/g, "");
                      setMrpMarkupPercent(next);
                      applyMarkupToAll(next);
                    }}
                    placeholder="10"
                  />
                  <button
                    className="btn small"
                    type="button"
                    title="Increase markup"
                    onClick={() => {
                      const next = String((Number(mrpMarkupPercent) || 0) + 1);
                      setMrpMarkupPercent(next);
                      applyMarkupToAll(next);
                    }}
                  >
                    +
                  </button>
                  <span className="small">MRP is auto-set {safeText(mrpMarkupPercent || "0")}% above each item's price. Edit a row's MRP to override.</span>
                </div>
                {unsavedMrpCount > 0 ? (
                  <div className="row mb-8">
                    <span className="small" style={{ color: "#b45309" }}>
                      {unsavedMrpCount} item{unsavedMrpCount === 1 ? " has" : "s have"} no MRP saved yet — the customer app shows the vendor price for
                      {unsavedMrpCount === 1 ? " it" : " them"} until you press <b>Save All</b>.
                    </span>
                  </div>
                ) : null}
                <div className="row mb-8 flex-gap10-center">
                  <label className="small" style={{ whiteSpace: "nowrap" }}>Adjust all prices %</label>
                  <input
                    className="input"
                    style={{ maxWidth: 90, textAlign: "center" }}
                    value={priceAdjustPercent}
                    onChange={(e) => setPriceAdjustPercent(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="10"
                  />
                  <button
                    className="btn small"
                    type="button"
                    title="Decrease every price by this percent"
                    disabled={busy || !vendorAllItems.length}
                    onClick={() => adjustAllPrices("down")}
                  >
                    − Decrease
                  </button>
                  <button
                    className="btn small"
                    type="button"
                    title="Increase every price by this percent"
                    disabled={busy || !vendorAllItems.length}
                    onClick={() => adjustAllPrices("up")}
                  >
                    + Increase
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    title="Save all rows (MRP + price) to the backend"
                    disabled={busy || !vendorId || !vendorAllItems.length}
                    onClick={saveAllMenuItems}
                  >
                    {busy ? "Saving..." : "Save All"}
                  </button>
                </div>
                {uploadedMenuImageUrl ? (
                  <div className="small mt-8">
                    Latest uploaded image URL: <code>{uploadedMenuImageUrl}</code>
                    <div className="mt-8">
                      <img
                        src={uploadedMenuImageUrl}
                        alt="Uploaded menu item"
                        style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0" }}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="table-wrap mt-10">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Upload</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Offer</th>
                        <th>MRP</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Available</th>
                        <th>Veg</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedVendorItems.map((item) => (
                        <tr key={safeText(item?.id || item?.name)}>
                          <td>
                            {safeText(item?.image || item?.hero_image) ? (
                              <img
                                src={safeText(item?.image || item?.hero_image)}
                                alt={safeText(item?.name || "Menu item")}
                                style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
                              />
                            ) : (
                              <span className="small">No image</span>
                            )}
                          </td>
                          <td>
                            <label className={`btn small ${busy ? "disabled" : ""}`}>
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden-input"
                                disabled={busy}
                                onChange={(e) => {
                                  uploadMenuRowImage(item, e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "name", "")}
                              onChange={(e) => updateMenuItemDraft(item, "name", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "category", "General")}
                              onChange={(e) => updateMenuItemDraft(item, "category", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "offer", "")}
                              placeholder="e.g. 20% OFF"
                              onChange={(e) => updateMenuItemDraft(item, "offer", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "mrp", "")}
                              placeholder="0"
                              onChange={(e) => updateMenuItemDraft(item, "mrp", e.target.value.replace(/[^0-9.]/g, ""))}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "price", "")}
                              onChange={(e) => updateMenuItemDraft(item, "price", e.target.value.replace(/[^0-9.]/g, ""))}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={menuFieldValue(item, "stock", "")}
                              onChange={(e) => updateMenuItemDraft(item, "stock", e.target.value.replace(/[^0-9]/g, ""))}
                            />
                          </td>
                          <td>
                            <select
                              className={`select status-select ${menuFlagValue(item, "available") ? "available" : "unavailable"}`}
                              value={menuFlagValue(item, "available") ? "yes" : "no"}
                              disabled={busy}
                              onChange={(e) => updateMenuItemDraft(item, "available", e.target.value === "yes")}
                            >
                              <option value="yes">Available</option>
                              <option value="no">Unavailable</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className={`select status-select ${menuFlagValue(item, "is_veg") ? "veg" : "nonveg"}`}
                              value={menuFlagValue(item, "is_veg") ? "veg" : "nonveg"}
                              disabled={busy}
                              onChange={(e) => updateMenuItemDraft(item, "is_veg", e.target.value === "veg")}
                            >
                              <option value="veg">Veg</option>
                              <option value="nonveg">Non-veg</option>
                            </select>
                          </td>
                          <td>
                            <div className="mini-row">
                              <button
                                className="btn small"
                                disabled={busy || !isMenuItemDirty(item)}
                                onClick={() => saveMenuItemRow(item)}
                              >
                                Save
                              </button>
                              <button className="btn small danger" disabled={busy} onClick={() => deleteMenuItem(item)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!pagedVendorItems.length ? (
                        <tr><td colSpan={11} className="small">No menu items found for this vendor.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={menuPage}
                  totalPages={Math.max(1, Math.ceil(vendorItems.length / PAGE_SIZE))}
                  onChange={setMenuPage}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {vendorDialogOpen ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setVendorDialogOpen(false))}>
          <div className="modal card maxw-900 vendor-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-edit-modal-head">
              <h3 className="m-0">{vendorMode === "new" ? "Add Vendor" : "Edit Vendor"}</h3>
              <button className="btn small" disabled={busy} onClick={() => setVendorDialogOpen(false)}>Close</button>
            </div>
            <div className="vendor-edit-modal-body">
              {renderVendorEditor()}
            </div>
          </div>
        </div>
      ) : null}
      {deleteZoneTarget ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setDeleteZoneTarget(null))}>
          <div className="modal card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">Delete delivery town</h3>
            <div className="small">
              Remove <strong>{safeText(deleteZoneTarget.zone)}</strong> from {deleteZoneTarget.count} vendor
              {deleteZoneTarget.count === 1 ? "" : "s"} using it? The town disappears from the app's place
              filter, and any kitchen left with no towns falls back to whatever its address parses to.
            </div>
            <div className="mt-12 flex-gap10">
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const zone = deleteZoneTarget.zone;
                  setDeleteZoneTarget(null);
                  await removeZoneEverywhere(zone);
                }}
              >
                {busy ? "Removing..." : "Yes, delete everywhere"}
              </button>
              <button className="btn" disabled={busy} onClick={() => setDeleteZoneTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteVendorTarget ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setDeleteVendorTarget(null))}>
          <div className="modal card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">Delete Vendor</h3>
            <div className="small">Are you sure you want to delete {safeText(deleteVendorTarget.name)} vendor?</div>
            <div className="small mt-8">
              <strong>ID:</strong> {deleteVendorTarget.id}
            </div>
            <div className="mt-12 flex-gap10">
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const id = deleteVendorTarget.id;
                  setDeleteVendorTarget(null);
                  await deleteVendor(id);
                }}
              >
                {busy ? "Deleting..." : "Yes, Delete"}
              </button>
              <button className="btn" disabled={busy} onClick={() => setDeleteVendorTarget(null)}>No</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

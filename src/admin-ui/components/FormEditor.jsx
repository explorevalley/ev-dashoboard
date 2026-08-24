import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaDownload, FaSave } from "react-icons/fa";
import {
  FestivalGalleryEditor,
  ListEditor,
  ObjectListEditor,
  HOTEL_SPACE_FACILITY_OPTIONS,
  normalizeObjectList
} from "./LegacyComponents";
export default function FormEditor({ table, selectedRow, onSave, onOpenImages, onUpsertPartial, contextPage, catalogLookup, externalPatch, TABLES, BucketLibraryModal, tableLabel, columnLabel, extractImageUrlsFromRow, keyColumnForTable, makeUuid, normalizeStringList, safeJsonParse, safeText, uniqStrings, adminApiForm }) {
  const initial = useMemo(() => {
    const out = {};
    (table.columns || []).forEach((c) => {
      out[c.name] = selectedRow?.[c.name] ?? "";
    });
    // Default ID for new rows when creating from pages that share a table.
    if (!selectedRow && out.id !== undefined) {
      const prefix = (contextPage === "cottages" && table.name === TABLES.HOTELS) ? "cottage_" : "";
      out.id = `${prefix}${makeUuid()}`;
    }
    // Default policy values for cottages/hotels when empty.
    if ((contextPage === "cottages" || contextPage === "hotels") && table.name === TABLES.HOTELS) {
      if (!out.check_in_time) out.check_in_time = "13:00";
      if (!out.check_out_time) out.check_out_time = "11:00";
      if (!out.min_nights) out.min_nights = 30;
      if (!out.max_nights) out.max_nights = 60;
      if (!out.child_policy) out.child_policy = "asdf";
    }
    return out;
  }, [table, selectedRow, contextPage, TABLES, makeUuid]);

  const [form, setForm] = useState(initial);
  const [isDirty, setIsDirty] = useState(false);
  const rowIdentity = useMemo(() => {
    const keyCol = keyColumnForTable(table);
    const keyVal = safeText(selectedRow?.[keyCol] ?? selectedRow?.id ?? "__new__");
    return `${safeText(table?.name)}:${keyVal || "__new__"}`;
  }, [keyColumnForTable, safeText, selectedRow, table]);
  const rowIdentityRef = useRef("");
  const lastExternalPatchTokenRef = useRef(0);
  const tableColSet = useMemo(() => new Set((table.columns || []).map((c) => c.name)), [table.columns]);
  const hasCol = (name) => tableColSet.has(name);

  useEffect(() => {
    // Hard reset when switching table/row.
    if (rowIdentityRef.current !== rowIdentity) {
      rowIdentityRef.current = rowIdentity;
      setForm(initial);
      setIsDirty(false);
      return;
    }
    // Soft sync only when user has no unsaved edits.
    if (!isDirty) setForm(initial);
  }, [initial, isDirty, rowIdentity]);

  useEffect(() => {
    const token = Number(externalPatch?.token || 0);
    const patch = externalPatch?.data;
    if (!token || token === lastExternalPatchTokenRef.current) return;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
    lastExternalPatchTokenRef.current = token;
    setIsDirty(true);
    setForm((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => {
        if (tableColSet.has(k)) next[k] = patch[k];
      });
      return next;
    });
  }, [externalPatch, tableColSet]);

  const setField = (name, value) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const [bucketPicker, setBucketPicker] = useState({
    open: false,
    title: "Choose from Gallery",
    folder: "images/",
    target: { kind: "", fieldName: "", galleryIndex: -1 }
  });
  const [lastCloseReason, setLastCloseReason] = useState("");

  const parseValue = (raw) => {
    if (raw === null || raw === undefined) return raw;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    if (raw === "") return null;
    const trimmed = String(raw).trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try { return JSON.parse(trimmed); } catch { return raw; }
    }
    return raw;
  };
  const parseValueForColumn = (col, raw) => {
    const t = safeText(col?.type).toLowerCase();
    if (raw === null || raw === undefined) return raw;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    const rawText = String(raw);
    const trimmed = rawText.trim();
    if (trimmed === "") {
      if (t === "array") return [];
      if (t === "object" || t === "json" || t === "jsonb") return {};
      if (t === "number" || t === "integer" || t === "float" || t === "double") return null;
      // Keep empty text as empty string to avoid NOT NULL text-column failures.
      return "";
    }
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if ((t === "number" || t === "integer" || t === "float" || t === "double") && !Number.isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try { return JSON.parse(trimmed); } catch { return rawText; }
    }
    return rawText;
  };

  const galleryRowsFromForm = () => {
    const img = normalizeStringList(form?.images);
    const ttl = normalizeStringList(form?.image_titles);
    const desc = normalizeStringList(form?.image_descriptions);
    const meta = normalizeObjectList(form?.image_meta);
    const count = Math.max(img.length, ttl.length, desc.length, meta.length, 1);
    return Array.from({ length: count }).map((_, i) => {
      const m = (meta[i] && typeof meta[i] === "object") ? meta[i] : {};
      return {
        image: safeText(img[i] || m.url || m.image || m.src).trim(),
        title: safeText(ttl[i] || m.title).trim(),
        description: safeText(desc[i] || m.description || m.caption).trim()
      };
    });
  };
  const galleryView = useMemo(() => {
    const rows = galleryRowsFromForm();
    return {
      images: rows.map((r) => safeText(r.image).trim()).filter(Boolean),
      titles: rows.map((r) => safeText(r.title).trim()),
      descriptions: rows.map((r) => safeText(r.description).trim())
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.images, form?.image_titles, form?.image_descriptions, form?.image_meta]);

  const setGalleryRowsInForm = (rows) => {
    const cleaned = (rows || [])
      .map((r) => ({
        image: safeText(r?.image).trim(),
        title: safeText(r?.title).trim(),
        description: safeText(r?.description).trim()
      }))
      .filter((r) => r.image || r.title || r.description);
    setField("images", cleaned.map((r) => r.image).filter(Boolean));
    setField("image_titles", cleaned.map((r) => r.title));
    setField("image_descriptions", cleaned.map((r) => r.description));
    setField("image_meta", cleaned.map((r) => ({ url: r.image, title: r.title, description: r.description })));
  };

  const persistFieldValue = async (fieldName, value) => {
    const url = safeText(value);
    if (!url) return;
    const keyCol = keyColumnForTable(table);
    const keyVal = safeText(form?.[keyCol] ?? selectedRow?.[keyCol] ?? selectedRow?.id ?? "");
    setField(fieldName, url);
    if (selectedRow && keyVal && onUpsertPartial) {
      const merged = { ...form, [fieldName]: url };
      const fullRow = {};
      (table.columns || []).forEach((c) => {
        const v = merged[c.name];
        fullRow[c.name] = parseValueForColumn(c, v);
      });
      if (fullRow[keyCol] === null || fullRow[keyCol] === undefined || String(fullRow[keyCol]).trim() === "") {
        fullRow[keyCol] = keyVal;
      }
      await onUpsertPartial(table.name, [fullRow]);
    }
  };

  const persistFields = async (patch) => {
    const keyCol = keyColumnForTable(table);
    const keyVal = safeText(form?.[keyCol] ?? selectedRow?.[keyCol] ?? selectedRow?.id ?? "");
    Object.entries(patch || {}).forEach(([k, v]) => setField(k, v));
    if (!(selectedRow && keyVal && onUpsertPartial)) return;
    const merged = { ...form, ...(patch || {}) };
    const fullRow = {};
    (table.columns || []).forEach((c) => {
      fullRow[c.name] = parseValueForColumn(c, merged[c.name]);
    });
    if (fullRow[keyCol] === null || fullRow[keyCol] === undefined || String(fullRow[keyCol]).trim() === "") {
      fullRow[keyCol] = keyVal;
    }
    await onUpsertPartial(table.name, [fullRow]);
  };

  const openBucketPickerForField = (fieldName, folderHint) => {
    setBucketPicker({
      open: true,
      title: `Choose from Gallery - ${columnLabel(table.name, fieldName)}`,
      folder: "images/",
      target: { kind: "field", fieldName: safeText(fieldName), galleryIndex: -1 }
    });
  };

  const openBucketPickerForGallery = (idx, folderHint) => {
    setBucketPicker({
      open: true,
      title: "Choose from Gallery - Gallery Image",
      folder: "images/",
      target: { kind: "gallery", fieldName: "", galleryIndex: Number(idx || 0) }
    });
  };

  const onPickFromBucket = async (url) => {
    const nextUrl = safeText(url);
    if (!nextUrl) return;
    const target = bucketPicker?.target || {};
    if (target.kind === "field" && target.fieldName) {
      setField(target.fieldName, nextUrl);
      return;
    }
    if (target.kind === "gallery") {
      const rows = galleryRowsFromForm();
      const index = Math.max(0, Number(target.galleryIndex || 0));
      while (rows.length <= index) rows.push({ image: "", title: "", description: "" });
      rows[index] = { ...(rows[index] || { title: "", description: "" }), image: nextUrl };
      setGalleryRowsInForm(rows);
      const patch = {
        images: rows.map((r) => safeText(r?.image).trim()).filter(Boolean),
        image_titles: rows.map((r) => safeText(r?.title).trim()),
        image_descriptions: rows.map((r) => safeText(r?.description).trim()),
        image_meta: rows
          .map((r) => ({ url: safeText(r?.image).trim(), title: safeText(r?.title).trim(), description: safeText(r?.description).trim() }))
          .filter((x) => !!x.url)
      };
      Object.entries(patch).forEach(([k, v]) => setField(k, v));
    }
  };

  const onPickManyFromBucket = async (urls) => {
    const picked = uniqStrings((Array.isArray(urls) ? urls : []).map((x) => safeText(x).trim()).filter(Boolean));
    if (!picked.length) return;
    const target = bucketPicker?.target || {};
    if (target.kind === "field" && target.fieldName) {
      setField(target.fieldName, picked[0]);
      return;
    }
    if (target.kind === "gallery") {
      const rows = galleryRowsFromForm();
      let index = Math.max(0, Number(target.galleryIndex || 0));
      if (!rows.length) rows.push({ image: "", title: "", description: "" });
      for (const u of picked) {
        while (rows.length <= index) rows.push({ image: "", title: "", description: "" });
        rows[index] = { ...(rows[index] || { title: "", description: "" }), image: u };
        index += 1;
      }
      setGalleryRowsInForm(rows);
      const patch = {
        images: rows.map((r) => safeText(r?.image).trim()).filter(Boolean),
        image_titles: rows.map((r) => safeText(r?.title).trim()),
        image_descriptions: rows.map((r) => safeText(r?.description).trim()),
        image_meta: rows
          .map((r) => ({ url: safeText(r?.image).trim(), title: safeText(r?.title).trim(), description: safeText(r?.description).trim() }))
          .filter((x) => !!x.url)
      };
      Object.entries(patch).forEach(([k, v]) => setField(k, v));
    }
  };
  useEffect(() => {
    if (!bucketPicker.open) return;
    return () => {
      console.log("[BucketPicker] closed due to parent unmount/remount", {
        table: safeText(table?.name),
        rowId: safeText(selectedRow?.id || ""),
        lastCloseReason: safeText(lastCloseReason || "unknown")
      });
    };
  }, [bucketPicker.open, table?.name, selectedRow?.id, lastCloseReason, safeText]);
  useEffect(() => {
    if (!bucketPicker.open && lastCloseReason) {
      console.log("[BucketPicker] closed", { reason: lastCloseReason, table: safeText(table?.name), rowId: safeText(selectedRow?.id || "") });
      setLastCloseReason("");
    }
  }, [bucketPicker.open, lastCloseReason, table?.name, selectedRow?.id, safeText]);

  const isUploadableField = (name) => {
    const n = safeText(name).toLowerCase();
    if (!n) return false;
    if (n.includes("image")) return true;
    if (n.endsWith("_url") || n.endsWith("url")) return true;
    if (n.includes("aadhaar")) return true;
    if (n.includes("avatar")) return true;
    return false;
  };

  const uploadForField = async (fieldName, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", `images/${safeText(table.name || "admin")}`);
    const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
    const url = safeText(j?.url || j?.path || "");
    if (!url) throw new Error("UPLOAD_FAILED");
    await persistFieldValue(fieldName, url);
  };

  const imageUrls = useMemo(() => extractImageUrlsFromRow(form), [form]);
  const isFestivalForm = table?.name === TABLES.FESTIVALS;
  const isTourForm = table?.name === TABLES.TOURS;
  const isHotelForm = table?.name === TABLES.HOTELS;
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);
  useEffect(() => {
    setShowAdvancedColumns(false);
  }, [table?.name, selectedRow?.id, contextPage]);
  const festivalHandledCols = useMemo(() => new Set([
    "title",
    "description",
    "location",
    "month",
    "date",
    "vibe",
    "ticket",
    "hero_image",
    "highlights",
    "inclusions",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "available",
    "price_dropped",
    "price_drop_percent",
    "vendor_mobile",
    "additional_comments",
    "pricing"
  ]), []);
  const tourHandledCols = useMemo(() => new Set([
    "title",
    "description",
    "location",
    "month",
    "date",
    "duration",
    "vibe",
    "ticket",
    "hero_image",
    "highlights",
    "inclusions",
    "itinerary",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "available",
    "price_dropped",
    "price_drop_percent",
    "vendor_mobile",
    "additional_comments",
    "pricing",
    "price",
    "exclusions",
    "max_guests",
    "availability",
    "map_embed_url",
    "faqs",
    "itinerary_items",
    "facts",
    "content_blocks",
    "i18n"
  ]), []);
  const hotelHandledCols = useMemo(() => new Set([
    "name",
    "description",
    "location",
    "category",
    "offer",
    "price_per_night",
    "pricePerNight",
    "rating",
    "reviews",
    "check_in_time",
    "check_out_time",
    "min_nights",
    "max_nights",
    "child_policy",
    "amenities",
    "room_types",
    "availability",
    "seasonal_pricing",
    "date_overrides",
    "hero_image",
    "images",
    "image_titles",
    "image_descriptions",
    "image_meta",
    "vendor_mobile",
    "additional_comments",
    "private_spaces",
    "shared_spaces",
    "room_amenities",
    "popular_with_guests",
    "room_features",
    "basic_facilities",
    "beds_and_blanket",
    "food_and_drinks",
    "safety_and_security",
    "media_and_entertainment",
    "bathroom",
    "other_facilities",
    "inclusion",
    "exclusion",
    "available",
    "price_dropped",
    "price_drop_percent"
  ]), []);
  const festivalPricing = useMemo(() => {
    const raw = form?.pricing;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (Array.isArray(src)) src = src[0] || {};
    if (!src || typeof src !== "object") src = {};
    const market = src.market_price ?? src.marketPrice ?? src.mrp ?? form?.price ?? "";
    const cost = src.cost_price ?? src.costPrice ?? src.base_price ?? src.basePrice ?? "";
    const selling = src.selling_price ?? src.sellingPrice ?? src.price ?? form?.price ?? "";
    return { market, cost, selling };
  }, [form?.pricing, form?.price]);
  const asNumberOrNull = (v) => {
    const t = safeText(v).trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  };
  const computeSellingFromDrop = (marketRaw, costRaw, dropRaw) => {
    const market = asNumberOrNull(marketRaw);
    const cost = asNumberOrNull(costRaw);
    const drop = asNumberOrNull(dropRaw);
    if (market === null || drop === null) return null;
    const pct = Math.max(0, Math.min(100, drop));
    const dropped = market - (market * pct / 100);
    const floor = cost === null ? dropped : Math.max(cost, dropped);
    return Math.round(floor * 100) / 100;
  };
  const toPricingObject = () => {
    let src = form?.pricing;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (Array.isArray(src)) src = src[0] || {};
    if (!src || typeof src !== "object") src = {};
    return src;
  };
  const setFestivalCostPrice = (nextRaw) => {
    const nextCost = asNumberOrNull(nextRaw);
    const src = toPricingObject();
    const nextSelling = computeSellingFromDrop(src?.market_price ?? festivalPricing.market, nextCost, form?.price_drop_percent);
    const currentSelling = asNumberOrNull(src?.selling_price ?? festivalPricing.selling);
    setField("pricing", {
      ...src,
      cost_price: nextCost,
      market_price: asNumberOrNull(src?.market_price ?? festivalPricing.market),
      selling_price: nextSelling === null ? (currentSelling === null ? null : Math.max(currentSelling, nextCost ?? currentSelling)) : nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const setFestivalMarketPrice = (nextRaw) => {
    const nextMarket = asNumberOrNull(nextRaw);
    const src = toPricingObject();
    const nextSelling = computeSellingFromDrop(nextMarket, src?.cost_price ?? festivalPricing.cost, form?.price_drop_percent);
    setField("pricing", {
      ...src,
      market_price: nextMarket,
      cost_price: asNumberOrNull(src?.cost_price ?? festivalPricing.cost),
      selling_price: nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const setFestivalPriceDropPercent = (nextRaw) => {
    const nextPct = asNumberOrNull(nextRaw);
    const clamped = nextPct === null ? 0 : Math.max(0, Math.min(100, nextPct));
    const nextSelling = computeSellingFromDrop(festivalPricing.market, festivalPricing.cost, clamped);
    setField("price_drop_percent", clamped);
    setField("price_dropped", clamped > 0);
    const src = toPricingObject();
    setField("pricing", {
      ...src,
      market_price: asNumberOrNull(festivalPricing.market),
      cost_price: asNumberOrNull(festivalPricing.cost),
      selling_price: nextSelling
    });
    if (isTourForm && hasCol("price") && nextSelling !== null) setField("price", nextSelling);
  };
  const setTourSellingPrice = (nextRaw) => {
    const nextText = safeText(nextRaw);
    const nextSelling = asNumberOrNull(nextText);
    setField("price", nextText);
    if (hasCol("pricing")) {
      const src = toPricingObject();
      setField("pricing", {
        ...src,
        market_price: asNumberOrNull(src?.market_price ?? festivalPricing.market),
        cost_price: asNumberOrNull(src?.cost_price ?? festivalPricing.cost),
        selling_price: nextSelling
      });
    }
  };
  const setTourPriceDropPercent = (nextRaw) => {
    const nextText = safeText(nextRaw);
    const nextPct = asNumberOrNull(nextText);
    const clamped = nextPct === null ? "" : String(Math.max(0, Math.min(100, nextPct)));
    setField("price_drop_percent", clamped);
    setField("price_dropped", Number(clamped || 0) > 0);
  };
  const tourAvailability = useMemo(() => {
    const raw = form?.availability;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    return {
      closedDates: normalizeStringList(src.closedDates)
    };
  }, [form?.availability]);
  const setTourAvailability = (next) => {
    setField("availability", {
      closedDates: normalizeStringList(next?.closedDates)
    });
  };
  const tourContentBlocks = useMemo(() => {
    const raw = form?.content_blocks;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    return {
      overview: safeText(src.overview),
      notes: safeText(src.notes),
      best_time: safeText(src.best_time),
      who_is_this_for: safeText(src.who_is_this_for),
      what_to_carry: normalizeStringList(src.what_to_carry)
    };
  }, [form?.content_blocks]);
  const setTourContentBlocks = (next) => {
    setField("content_blocks", {
      overview: safeText(next?.overview),
      notes: safeText(next?.notes),
      best_time: safeText(next?.best_time),
      who_is_this_for: safeText(next?.who_is_this_for),
      what_to_carry: normalizeStringList(next?.what_to_carry)
    });
  };
  const tourI18nEn = useMemo(() => {
    const raw = form?.i18n;
    let src = raw;
    if (typeof src === "string") src = safeJsonParse(src) || {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    const en = src?.en && typeof src.en === "object" ? src.en : {};
    return {
      title: safeText(en.title),
      description: safeText(en.description)
    };
  }, [form?.i18n]);
  const setTourI18nEn = (next) => {
    setField("i18n", {
      en: {
        title: safeText(next?.title),
        description: safeText(next?.description)
      }
    });
  };
  const relatedItem = useMemo(() => {
    if (table?.name !== TABLES.BOOKINGS) return null;
    const type = safeText(form?.type || selectedRow?.type || "").toLowerCase();
    const itemId = safeText(form?.item_id || form?.itemId || selectedRow?.item_id || selectedRow?.itemId || "");
    if (!type || !itemId) return null;
    if (type === "tour") return catalogLookup?.toursById?.get(itemId) || null;
    if (type === "hotel") return catalogLookup?.hotelsById?.get(itemId) || null;
    return null;
  }, [catalogLookup, form?.type, form?.item_id, form?.itemId, selectedRow?.type, selectedRow?.item_id, selectedRow?.itemId, table?.name]);
  const relatedItemUrls = useMemo(() => uniqStrings(extractImageUrlsFromRow(relatedItem || {})), [relatedItem]);

  return (
    <div className="card">
      <h3 className="mt-0">Create / Edit {typeof tableLabel === "function" ? tableLabel(table.name) : safeText(table?.name)}</h3>
      {relatedItemUrls.length ? (
        <div className="img-strip">
          <div className="img-chip"><span>Booked Item</span></div>
          {relatedItemUrls.slice(0, 10).map((u, i) => (
            <img key={u} className="thumb" src={u} alt="" onClick={() => onOpenImages?.("Booked item images", relatedItemUrls, i)} />
          ))}
        </div>
      ) : null}
      {imageUrls.length ? (
        <div className="img-strip">
          <div className="img-chip"><span>Images</span></div>
          {imageUrls.slice(0, 10).map((u, i) => (
            <img key={u} className="thumb" src={u} alt="" onClick={() => onOpenImages?.(table.name, imageUrls, i)} />
          ))}
        </div>
      ) : null}
      {isFestivalForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Festival Basics</div>
            <div className="form-grid">
              <div className="field full">
                <label>Title</label>
                <input className="input" value={safeText(form.title)} onChange={(e) => setField("title", e.target.value)} placeholder="Kullu Dussehra Festival" />
              </div>
              <div className="field full">
                <label>Description</label>
                <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Tell users what this festival is about..." />
              </div>
              <div className="field">
                <label>Location</label>
                <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Kullu, Himachal Pradesh" />
              </div>
              <div className="field">
                <label>Month</label>
                <input className="input" value={safeText(form.month)} onChange={(e) => setField("month", e.target.value)} placeholder="October" />
              </div>
              <div className="field">
                <label>Date</label>
                <input className="input" type="date" value={safeText(form.date).slice(0, 10)} onChange={(e) => setField("date", e.target.value)} />
              </div>
              <div className="field">
                <label>Vendor Mobile</label>
                <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+919999000001" />
              </div>
              <div className="field full">
                <label>Vibe</label>
                <input className="input" value={safeText(form.vibe)} onChange={(e) => setField("vibe", e.target.value)} placeholder="Cultural, festive, traditional..." />
              </div>
              <div className="field full">
                <label>Ticket Info</label>
                <textarea className="textarea" value={safeText(form.ticket)} onChange={(e) => setField("ticket", e.target.value)} placeholder="Entry details and pass information" />
              </div>
              <div className="field full">
                <label>Additional Comments</label>
                <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Operational notes, schedule caveats..." />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Media</div>
            <div className="form-grid">
              <div className="field full">
                <label>Hero Image</label>
                <div className="flex-gap10-center">
                  <input className="input flex-1" value={safeText(form.hero_image)} onChange={(e) => setField("hero_image", e.target.value)} placeholder="https://.../storage/v1/object/public/..." />
                  <label className="btn small pointer">
                    <FaDownload /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden-input"
                      onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        e.target.value = "";
                        try {
                          await uploadForField("hero_image", file);
                        } catch (err) {
                          alert(String(err?.message || err));
                        }
                      }}
                    />
                  </label>
                  <button className="btn small" onClick={() => openBucketPickerForField("hero_image", "images/festivals")}>Choose from Gallery</button>
                </div>
              </div>
              <FestivalGalleryEditor
                images={galleryView.images}
                titles={galleryView.titles}
                descriptions={galleryView.descriptions}
                uploadFolder="images/festivals"
                onPickFromBucket={(idx) => openBucketPickerForGallery(idx, "images/festivals")}
                onChange={(next) => {
                  const patch = {
                    images: next.images,
                    image_titles: next.image_titles,
                    image_descriptions: next.image_descriptions,
                    image_meta: next.image_meta
                  };
                  Object.entries(patch).forEach(([k, v]) => setField(k, v));
                }}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Highlights & Inclusions</div>
            <div className="form-grid">
              <ListEditor
                title="Highlights"
                values={normalizeStringList(form.highlights)}
                onChange={(list) => setField("highlights", list)}
                placeholder="Traditional Rath Yatra and deity processions"
              />
              <ListEditor
                title="Inclusions"
                values={normalizeStringList(form.inclusions)}
                onChange={(list) => setField("inclusions", list)}
                placeholder="Entry to main festival ground"
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Availability & Pricing</div>
            <div className="form-grid">
              <div className="field full">
                <label>Price Drop %</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={safeText(form.price_drop_percent)}
                  onChange={(e) => setFestivalPriceDropPercent(e.target.value)}
                />
              </div>
              <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.available !== false}
                  onChange={(e) => setField("available", e.target.checked)}
                />
                Available
              </label>
              <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={!!form.price_dropped}
                  onChange={(e) => setField("price_dropped", e.target.checked)}
                />
                Price Dropped
              </label>
              <div className="field">
                <label>Market Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.market)}
                  onChange={(e) => setFestivalMarketPrice(e.target.value)}
                  placeholder="1999"
                />
              </div>
              <div className="field">
                <label>Cost Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.cost)}
                  onChange={(e) => setFestivalCostPrice(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div className="field">
                <label>Selling Price</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={safeText(festivalPricing.selling)}
                  readOnly
                  placeholder="1499"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isTourForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Tour Basics</div>
            <div className="form-grid">
              {hasCol("title") ? (
                <div className="field full">
                  <label>Title</label>
                  <input className="input" value={safeText(form.title)} onChange={(e) => setField("title", e.target.value)} placeholder="Great Himalayan Tour" />
                </div>
              ) : null}
              {hasCol("description") ? (
                <div className="field full">
                  <label>Description</label>
                  <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Describe this tour experience..." />
                </div>
              ) : null}
              {hasCol("location") ? (
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Manali, Himachal Pradesh" />
                </div>
              ) : null}
              {hasCol("duration") ? (
                <div className="field">
                  <label>Duration</label>
                  <input className="input" value={safeText(form.duration)} onChange={(e) => setField("duration", e.target.value)} placeholder="3 Days / 2 Nights" />
                </div>
              ) : null}
              {hasCol("max_guests") ? (
                <div className="field">
                  <label>Max Guests</label>
                  <input className="input" type="number" min="1" value={safeText(form.max_guests)} onChange={(e) => setField("max_guests", e.target.value)} placeholder="2" />
                </div>
              ) : null}
              {hasCol("month") ? (
                <div className="field">
                  <label>Month</label>
                  <input className="input" value={safeText(form.month)} onChange={(e) => setField("month", e.target.value)} placeholder="October" />
                </div>
              ) : null}
              {hasCol("date") ? (
                <div className="field">
                  <label>Date</label>
                  <input className="input" type="date" value={safeText(form.date).slice(0, 10)} onChange={(e) => setField("date", e.target.value)} />
                </div>
              ) : null}
              {hasCol("vendor_mobile") ? (
                <div className="field">
                  <label>Vendor Mobile</label>
                  <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+919999000001" />
                </div>
              ) : null}
              {hasCol("vibe") ? (
                <div className="field full">
                  <label>Vibe</label>
                  <input className="input" value={safeText(form.vibe)} onChange={(e) => setField("vibe", e.target.value)} placeholder="Adventure, scenic, family-friendly..." />
                </div>
              ) : null}
              {hasCol("ticket") ? (
                <div className="field full">
                  <label>Booking Notes</label>
                  <textarea className="textarea" value={safeText(form.ticket)} onChange={(e) => setField("ticket", e.target.value)} placeholder="Ticket or booking details" />
                </div>
              ) : null}
              {hasCol("additional_comments") ? (
                <div className="field full">
                  <label>Additional Comments</label>
                  <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Operational notes..." />
                </div>
              ) : null}
              {hasCol("map_embed_url") ? (
                <div className="field full">
                  <label>Map URL</label>
                  <input className="input" value={safeText(form.map_embed_url)} onChange={(e) => setField("map_embed_url", e.target.value)} placeholder="https://www.google.com/maps?q=..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("hero_image") || hasCol("images") || hasCol("image_titles") || hasCol("image_descriptions") || hasCol("image_meta")) ? (
            <div className="form-section">
              <div className="section-title">Media</div>
              <div className="form-grid">
                {hasCol("hero_image") ? (
                  <div className="field full">
                    <label>Hero Image</label>
                    <div className="flex-gap10-center">
                      {form.hero_image ? <img className="thumb" src={safeText(form.hero_image)} alt="" /> : null}
                      <div className="small">{form.hero_image ? `Current: ${safeText(form.hero_image).slice(0, 80)}` : "No image yet."}</div>
                      <label className="btn small pointer">
                        <FaDownload /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden-input"
                          onChange={async (e) => {
                            const file = e.target.files && e.target.files[0];
                            e.target.value = "";
                            try {
                              await uploadForField("hero_image", file);
                            } catch (err) {
                              alert(String(err?.message || err));
                            }
                          }}
                        />
                      </label>
                      <button className="btn small" onClick={() => openBucketPickerForField("hero_image", "images/tours")}>Choose from Gallery</button>
                    </div>
                  </div>
                ) : null}
                <FestivalGalleryEditor
                  images={galleryView.images}
                  titles={galleryView.titles}
                  descriptions={galleryView.descriptions}
                  uploadFolder="images/tours"
                  onPickFromBucket={(idx) => openBucketPickerForGallery(idx, "images/tours")}
                  onChange={(next) => {
                    const patch = {};
                    if (hasCol("images")) patch.images = next.images;
                    if (hasCol("image_titles")) patch.image_titles = next.image_titles;
                    if (hasCol("image_descriptions")) patch.image_descriptions = next.image_descriptions;
                    if (hasCol("image_meta")) patch.image_meta = next.image_meta;
                    Object.entries(patch).forEach(([k, v]) => setField(k, v));
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="section-title">Plan Details</div>
            <div className="form-grid">
              {hasCol("highlights") ? (
                <ListEditor
                  title="Highlights"
                  values={normalizeStringList(form.highlights)}
                  onChange={(list) => setField("highlights", list)}
                  placeholder="Sunrise viewpoint and local market walk"
                />
              ) : null}
              {hasCol("inclusions") ? (
                <ListEditor
                  title="Inclusions"
                  values={normalizeStringList(form.inclusions)}
                  onChange={(list) => setField("inclusions", list)}
                  placeholder="Guide support and transport"
                />
              ) : null}
              {hasCol("exclusions") ? (
                <ListEditor
                  title="Exclusions"
                  values={normalizeStringList(form.exclusions)}
                  onChange={(list) => setField("exclusions", list)}
                  placeholder="Meals unless included by property"
                />
              ) : null}
              {hasCol("itinerary") ? (
                <div className="field full">
                  <label>Itinerary Summary</label>
                  <textarea className="textarea" value={safeText(form.itinerary)} onChange={(e) => setField("itinerary", e.target.value)} placeholder="Day 1: ...\nDay 2: ..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("faqs") || hasCol("itinerary_items") || hasCol("facts") || hasCol("content_blocks") || hasCol("i18n") || hasCol("availability")) ? (
            <div className="form-section">
              <div className="section-title">Advanced Content</div>
              <div className="form-grid">
                {hasCol("faqs") ? (
                  <ObjectListEditor
                    title="FAQs"
                    items={normalizeObjectList(form.faqs)}
                    onChange={(next) => setField("faqs", next)}
                    addLabel="Add FAQ"
                    fields={[
                      { key: "question", label: "Question", placeholder: "Is this package suitable for couples?" },
                      { key: "answer", label: "Answer", type: "textarea", placeholder: "Yes, this package is designed..." }
                    ]}
                  />
                ) : null}
                {hasCol("itinerary_items") ? (
                  <ObjectListEditor
                    title="Day-wise Itinerary"
                    items={normalizeObjectList(form.itinerary_items)}
                    onChange={(next) => setField("itinerary_items", next)}
                    addLabel="Add Day"
                    fields={[
                      { key: "day", label: "Day", type: "number", placeholder: "1" },
                      { key: "title", label: "Title", placeholder: "Arrival + Tandi Cottage Stay" },
                      { key: "content", label: "Content", type: "textarea", placeholder: "Route, activities, overnight, notes..." }
                    ]}
                  />
                ) : null}
                {hasCol("facts") ? (
                  <ObjectListEditor
                    title="Quick Facts"
                    items={normalizeObjectList(form.facts)}
                    onChange={(next) => setField("facts", next)}
                    addLabel="Add Fact"
                    fields={[
                      { key: "label", label: "Label", placeholder: "Great for couples seeking scenic views" },
                      { key: "value", label: "Value", placeholder: "Optional short value" }
                    ]}
                  />
                ) : null}
                {hasCol("content_blocks") ? (
                  <div className="field full">
                    <label>Content Blocks</label>
                    <div className="obj-card">
                      <div className="field">
                        <label>Overview</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.overview)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, overview: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Notes</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.notes)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, notes: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Best Time</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.best_time)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, best_time: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Who Is This For</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourContentBlocks.who_is_this_for)} onChange={(e) => setTourContentBlocks({ ...tourContentBlocks, who_is_this_for: e.target.value })} />
                      </div>
                      <ListEditor
                        title="What To Carry"
                        values={tourContentBlocks.what_to_carry}
                        onChange={(list) => setTourContentBlocks({ ...tourContentBlocks, what_to_carry: list })}
                        placeholder="Warm layers"
                      />
                    </div>
                  </div>
                ) : null}
                {hasCol("i18n") ? (
                  <div className="field full">
                    <label>English Translation</label>
                    <div className="obj-card">
                      <div className="field">
                        <label>Title (EN)</label>
                        <input className="input" value={safeText(tourI18nEn.title)} onChange={(e) => setTourI18nEn({ ...tourI18nEn, title: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Description (EN)</label>
                        <textarea className="textarea gallery-textarea" value={safeText(tourI18nEn.description)} onChange={(e) => setTourI18nEn({ ...tourI18nEn, description: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : null}
                {hasCol("max_guests") ? (
                  <div className="field">
                    <label>Capacity (Persons)</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={safeText(form.max_guests)}
                      onChange={(e) => setField("max_guests", e.target.value)}
                      placeholder="4"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {(hasCol("price_drop_percent") || hasCol("available") || hasCol("price_dropped") || hasCol("pricing") || hasCol("price")) ? (
            <div className="form-section">
              <div className="section-title">Availability & Pricing</div>
              <div className="form-grid">
                {hasCol("price_drop_percent") ? (
                  <div className="field full">
                    <label>Price Drop %</label>
                    <input
                      className="input"
                      type="text"
                      value={safeText(form.price_drop_percent)}
                      onChange={(e) => setTourPriceDropPercent(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                ) : null}
                {hasCol("available") ? (
                  <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={form.available !== false}
                      onChange={(e) => setField("available", e.target.checked)}
                    />
                    Available
                  </label>
                ) : null}
                {hasCol("price_dropped") ? (
                  <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={!!form.price_dropped}
                      onChange={(e) => setField("price_dropped", e.target.checked)}
                    />
                    Price Dropped
                  </label>
                ) : null}
                {hasCol("pricing") ? (
                  <>
                    <div className="field">
                      <label>Market Price</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={safeText(festivalPricing.market)}
                        onChange={(e) => setFestivalMarketPrice(e.target.value)}
                        placeholder="1999"
                      />
                    </div>
                    <div className="field">
                      <label>Cost Price</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={safeText(festivalPricing.cost)}
                        onChange={(e) => setFestivalCostPrice(e.target.value)}
                        placeholder="1200"
                      />
                    </div>
                    <div className="field">
                      <label>Selling Price</label>
                      <input
                        className="input"
                        type="text"
                        value={safeText(hasCol("price") ? form.price : festivalPricing.selling)}
                        onChange={(e) => setTourSellingPrice(e.target.value)}
                        placeholder="1499"
                      />
                    </div>
                  </>
                ) : null}
                {!hasCol("pricing") && hasCol("price") ? (
                  <div className="field full">
                    <label>Selling Price</label>
                    <input className="input" type="text" value={safeText(form.price)} onChange={(e) => setTourSellingPrice(e.target.value)} placeholder="1499" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {isHotelForm ? (
        <div className="festival-form">
          <div className="form-section">
            <div className="section-title">Stay Basics</div>
            <div className="form-grid">
              {hasCol("name") ? (
                <div className="field full">
                  <label>Property Name</label>
                  <input className="input" value={safeText(form.name)} onChange={(e) => setField("name", e.target.value)} placeholder="Shree Ganga Cottages and Resort" />
                </div>
              ) : null}
              {hasCol("description") ? (
                <div className="field full">
                  <label>Description</label>
                  <textarea className="textarea" value={safeText(form.description)} onChange={(e) => setField("description", e.target.value)} placeholder="Describe the stay experience..." />
                </div>
              ) : null}
              {hasCol("location") ? (
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={safeText(form.location)} onChange={(e) => setField("location", e.target.value)} placeholder="Manali, Himachal Pradesh" />
                </div>
              ) : null}
              {hasCol("category") ? (
                <div className="field">
                  <label>Category</label>
                  <input className="input" value={safeText(form.category)} onChange={(e) => setField("category", e.target.value)} placeholder="hotel / cottage" />
                </div>
              ) : null}
              {hasCol("vendor_mobile") ? (
                <div className="field">
                  <label>Vendor Mobile</label>
                  <input className="input" value={safeText(form.vendor_mobile)} onChange={(e) => setField("vendor_mobile", e.target.value)} placeholder="+91-00000-00000" />
                </div>
              ) : null}
              {hasCol("additional_comments") ? (
                <div className="field full">
                  <label>Additional Comments</label>
                  <textarea className="textarea" value={safeText(form.additional_comments)} onChange={(e) => setField("additional_comments", e.target.value)} placeholder="Any extra notes..." />
                </div>
              ) : null}
            </div>
          </div>

          {(hasCol("hero_image") || hasCol("images") || hasCol("image_titles") || hasCol("image_descriptions") || hasCol("image_meta")) ? (
            <div className="form-section">
              <div className="section-title">Media</div>
              <div className="form-grid">
                {hasCol("hero_image") ? (
                  <div className="field full">
                    <label>Hero Image</label>
                    <div className="flex-gap10-center">
                      {form.hero_image ? <img className="thumb" src={safeText(form.hero_image)} alt="" /> : null}
                      <div className="small">{form.hero_image ? `Current: ${safeText(form.hero_image).slice(0, 80)}` : "No image yet."}</div>
                      <label className="btn small pointer">
                        <FaDownload /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden-input"
                          onChange={async (e) => {
                            const file = e.target.files && e.target.files[0];
                            e.target.value = "";
                            try {
                              await uploadForField("hero_image", file);
                            } catch (err) {
                              alert(String(err?.message || err));
                            }
                          }}
                        />
                      </label>
                      <button className="btn small" onClick={() => openBucketPickerForField("hero_image", "images/hotels")}>Choose from Gallery</button>
                    </div>
                  </div>
                ) : null}
                <FestivalGalleryEditor
                  images={galleryView.images}
                  titles={galleryView.titles}
                  descriptions={galleryView.descriptions}
                  uploadFolder="images/hotels"
                  imageOnly
                  onPickFromBucket={(idx) => openBucketPickerForGallery(idx, "images/hotels")}
                  onChange={(next) => {
                    const patch = {};
                    if (hasCol("images")) patch.images = next.images;
                    if (hasCol("image_titles")) patch.image_titles = next.image_titles;
                    if (hasCol("image_descriptions")) patch.image_descriptions = next.image_descriptions;
                    if (hasCol("image_meta")) patch.image_meta = next.image_meta;
                    Object.entries(patch).forEach(([k, v]) => setField(k, v));
                  }}
                />
              </div>
            </div>
          ) : null}

          {(hasCol("seasonal_pricing") || hasCol("date_overrides") || hasCol("price_dropped") || hasCol("price_drop_percent")) ? (
            <div className="form-section">
              <div className="section-title">Seasonal Pricing & Price Drop</div>
              <div className="form-grid">
                {hasCol("seasonal_pricing") ? (
                  <div className="field full">
                    <ObjectListEditor
                      title="Seasonal Pricing"
                      items={normalizeObjectList(form.seasonal_pricing)}
                      onChange={(next) => setField("seasonal_pricing", next)}
                      addLabel="Add Season"
                      fields={[
                        { key: "enabled", label: "Season On", type: "boolean" },
                        { key: "label", label: "Label", placeholder: "Peak Season" },
                        { key: "start", label: "Start Date", placeholder: "2026-12-10" },
                        { key: "end", label: "End Date", placeholder: "2027-01-05" },
                        { key: "price", label: "Price / Night", type: "number", placeholder: "3500" }
                      ]}
                    />
                    <div className="field full mt-8">
                      <label>Seasonal Pricing (JSON)</label>
                      <textarea
                        className="textarea json-compact"
                        value={JSON.stringify(form.seasonal_pricing || [], null, 2)}
                        onChange={(e) => {
                          const parsed = safeJsonParse(e.target.value);
                          if (Array.isArray(parsed)) setField("seasonal_pricing", parsed);
                        }}
                        placeholder='[{"label":"Off Season","price":3500,"enabled":true}]'
                      />
                    </div>
                  </div>
                ) : null}
                {hasCol("date_overrides") ? (
                  <div className="field full">
                    <label>Date Overrides (JSON)</label>
                    <textarea
                      className="textarea gallery-textarea"
                      value={JSON.stringify(form.date_overrides || {}, null, 2)}
                      onChange={(e) => {
                        const parsed = safeJsonParse(e.target.value);
                        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                          setField("date_overrides", parsed);
                        }
                      }}
                    />
                  </div>
                ) : null}
                {hasCol("price_dropped") ? (
                  <label className={`pill-toggle ${form.price_dropped ? "on" : ""}`}>
                    <input type="checkbox" checked={!!form.price_dropped} onChange={(e) => setField("price_dropped", e.target.checked)} />
                    Price Dropped
                  </label>
                ) : null}
                {hasCol("price_drop_percent") ? (
                  <div className="field">
                    <label>Price Drop %</label>
                    <input className="input" type="number" min="0" max="100" value={safeText(form.price_drop_percent)} onChange={(e) => setField("price_drop_percent", e.target.value)} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="form-section">
            <div className="section-title">Rooms & Pricing</div>
            <div className="form-grid">
              {hasCol("price_per_night") || hasCol("pricePerNight") ? (
                <div className="field">
                  <label>Base Price / Night</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={safeText(form.price_per_night ?? form.pricePerNight)}
                    onChange={(e) => setField(hasCol("price_per_night") ? "price_per_night" : "pricePerNight", e.target.value)}
                    placeholder="2800"
                  />
                </div>
              ) : null}
              {hasCol("offer") ? (
                <div className="field">
                  <label>Offer</label>
                  <input
                    className="input"
                    value={safeText(form.offer)}
                    onChange={(e) => setField("offer", e.target.value)}
                    placeholder="20% OFF or BUY 1 GET 1 FREE"
                  />
                </div>
              ) : null}
              {hasCol("rating") ? (
                <div className="field">
                  <label>Rating</label>
                  <input className="input" type="number" min="0" max="5" value={safeText(form.rating)} onChange={(e) => setField("rating", e.target.value)} placeholder="4.5" />
                </div>
              ) : null}
              {hasCol("reviews") ? (
                <div className="field">
                  <label>Review Count</label>
                  <input className="input" type="number" min="0" value={safeText(form.reviews)} onChange={(e) => setField("reviews", e.target.value)} placeholder="120" />
                </div>
              ) : null}
              {hasCol("room_types") ? (
                <ObjectListEditor
                  title="Room Types"
                  items={normalizeObjectList(form.room_types)}
                  onChange={(next) => setField("room_types", next)}
                  addLabel="Add Room Type"
                  fields={[
                    { key: "type", label: "Type", placeholder: "Standard Room" },
                    { key: "price", label: "Price / Night", type: "number", placeholder: "2800" },
                    { key: "capacity", label: "Capacity", type: "number", placeholder: "2" }
                  ]}
                />
              ) : null}
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Policies & Timing</div>
            <div className="form-grid">
              {hasCol("check_in_time") ? (
                <div className="field">
                  <label>Check-in Time</label>
                  <input className="input" value={safeText(form.check_in_time)} onChange={(e) => setField("check_in_time", e.target.value)} placeholder="14:00" />
                </div>
              ) : null}
              {hasCol("check_out_time") ? (
                <div className="field">
                  <label>Check-out Time</label>
                  <input className="input" value={safeText(form.check_out_time)} onChange={(e) => setField("check_out_time", e.target.value)} placeholder="11:00" />
                </div>
              ) : null}
              {hasCol("min_nights") ? (
                <div className="field">
                  <label>Min Nights</label>
                  <input className="input" type="number" min="1" value={safeText(form.min_nights)} onChange={(e) => setField("min_nights", e.target.value)} placeholder="1" />
                </div>
              ) : null}
              {hasCol("max_nights") ? (
                <div className="field">
                  <label>Max Nights</label>
                  <input className="input" type="number" min="1" value={safeText(form.max_nights)} onChange={(e) => setField("max_nights", e.target.value)} placeholder="30" />
                </div>
              ) : null}
              {hasCol("child_policy") ? (
                <div className="field full">
                  <label>Child Policy</label>
                  <textarea className="textarea" value={safeText(form.child_policy)} onChange={(e) => setField("child_policy", e.target.value)} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Spaces & Facilities</div>
            <div className="form-grid">
              {hasCol("private_spaces") ? (
                <ListEditor title="Private Spaces" values={normalizeStringList(form.private_spaces)} onChange={(list) => setField("private_spaces", list)} placeholder="Private Balcony" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.private_spaces} />
              ) : null}
              {hasCol("shared_spaces") ? (
                <ListEditor title="Shared Spaces" values={normalizeStringList(form.shared_spaces)} onChange={(list) => setField("shared_spaces", list)} placeholder="Shared Lounge" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.shared_spaces} />
              ) : null}
              {hasCol("room_amenities") ? (
                <ListEditor title="Room Amenities" values={normalizeStringList(form.room_amenities)} onChange={(list) => setField("room_amenities", list)} placeholder="Room Heater" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.room_amenities} />
              ) : null}
              {hasCol("popular_with_guests") ? (
                <ListEditor title="Popular With Guests" values={normalizeStringList(form.popular_with_guests)} onChange={(list) => setField("popular_with_guests", list)} placeholder="Mountain View" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.popular_with_guests} />
              ) : null}
              {hasCol("room_features") ? (
                <ListEditor title="Room Features" values={normalizeStringList(form.room_features)} onChange={(list) => setField("room_features", list)} placeholder="Valley View" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.room_features} />
              ) : null}
              {hasCol("basic_facilities") ? (
                <ListEditor title="Basic Facilities" values={normalizeStringList(form.basic_facilities)} onChange={(list) => setField("basic_facilities", list)} placeholder="WiFi" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.basic_facilities} />
              ) : null}
              {hasCol("beds_and_blanket") ? (
                <ListEditor title="Beds & Blanket" values={normalizeStringList(form.beds_and_blanket)} onChange={(list) => setField("beds_and_blanket", list)} placeholder="Extra Pillows" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.beds_and_blanket} />
              ) : null}
              {hasCol("food_and_drinks") ? (
                <ListEditor title="Food & Drinks" values={normalizeStringList(form.food_and_drinks)} onChange={(list) => setField("food_and_drinks", list)} placeholder="In-room Dining" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.food_and_drinks} />
              ) : null}
              {hasCol("safety_and_security") ? (
                <ListEditor title="Safety & Security" values={normalizeStringList(form.safety_and_security)} onChange={(list) => setField("safety_and_security", list)} placeholder="CCTV" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.safety_and_security} />
              ) : null}
              {hasCol("media_and_entertainment") ? (
                <ListEditor title="Media & Entertainment" values={normalizeStringList(form.media_and_entertainment)} onChange={(list) => setField("media_and_entertainment", list)} placeholder="Smart TV" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.media_and_entertainment} />
              ) : null}
              {hasCol("bathroom") ? (
                <ListEditor title="Bathroom" values={normalizeStringList(form.bathroom)} onChange={(list) => setField("bathroom", list)} placeholder="Geyser" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.bathroom} />
              ) : null}
              {hasCol("other_facilities") ? (
                <ListEditor title="Other Facilities" values={normalizeStringList(form.other_facilities)} onChange={(list) => setField("other_facilities", list)} placeholder="Bonfire Area" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.other_facilities} />
              ) : null}
              {hasCol("inclusion") ? (
                <ListEditor title="Inclusions" values={normalizeStringList(form.inclusion)} onChange={(list) => setField("inclusion", list)} placeholder="WiFi" quickAddItems={HOTEL_SPACE_FACILITY_OPTIONS.inclusion} />
              ) : null}
              {hasCol("exclusion") ? (
                <ListEditor title="Exclusions" values={normalizeStringList(form.exclusion)} onChange={(list) => setField("exclusion", list)} placeholder="Meals unless included" />
              ) : null}
            </div>
          </div>

          {(hasCol("available") || hasCol("price_dropped") || hasCol("price_drop_percent")) ? (
            <div className="form-section">
              <div className="section-title">Status</div>
              <div className="form-grid">
                {hasCol("available") ? (
                  <label className={`pill-toggle ${form.available !== false ? "on" : ""}`}>
                    <input type="checkbox" checked={form.available !== false} onChange={(e) => setField("available", e.target.checked)} />
                    Available
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {(isFestivalForm || isTourForm || isHotelForm) ? (
        <div className="mt-8 mb-8">
          <button
            type="button"
            className="btn small"
            onClick={() => setShowAdvancedColumns((v) => !v)}
          >
            {showAdvancedColumns ? "Hide Duplicate Column Editor" : "Show All Columns (Advanced)"}
          </button>
        </div>
      ) : null}
      <div className="form-grid">
        {(table.columns || []).map((col) => {
          if (isFestivalForm && festivalHandledCols.has(col.name) && !showAdvancedColumns) return null;
          if (isTourForm && tourHandledCols.has(col.name) && !showAdvancedColumns) return null;
          if (isHotelForm && hotelHandledCols.has(col.name) && !showAdvancedColumns) return null;
          const raw = form[col.name] ?? "";
          const asText = typeof raw === "object" ? JSON.stringify(raw, null, 2) : String(raw);
          const longText = asText.length > 120 || col.type === "object" || col.type === "array";
          const canUpload = !longText && isUploadableField(col.name);
          return (
            <div key={col.name} className={`field ${longText ? "full" : ""}`}>
              <label>{columnLabel(table.name, col.name)}</label>
              {longText ? (
                <textarea className="textarea" value={asText} onChange={(e) => setField(col.name, e.target.value)} />
              ) : (
                <div className="flex-gap10-center">
                  <input className="input flex-1" value={asText} onChange={(e) => setField(col.name, e.target.value)} />
                  {canUpload ? (
                    <>
                      <label className="btn small pointer">
                        <FaDownload /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden-input"
                          onChange={async (e) => {
                            const file = e.target.files && e.target.files[0];
                            e.target.value = "";
                            try {
                              await uploadForField(col.name, file);
                            } catch (err) {
                              // Surface upload errors in the main banner (same as other errors).
                              alert(String(err?.message || err));
                            }
                          }}
                        />
                      </label>
                      <button className="btn small" onClick={() => openBucketPickerForField(col.name, `images/${safeText(table.name || "admin")}`)}>Choose from Gallery</button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-12">
        <button className="btn primary" onClick={() => {
          const row = {};
          (table.columns || []).forEach((c) => {
            if (!tableColSet.has(c.name)) return;
            row[c.name] = parseValueForColumn(c, form[c.name]);
          });
          // Ensure primary key isn't null; Supabase upsert will fail otherwise.
          const keyCol = keyColumnForTable(table);
          if ((row[keyCol] === null || row[keyCol] === undefined || String(row[keyCol]).trim() === "") && keyCol) {
            const prefix = (contextPage === "cottages" && table.name === TABLES.HOTELS && keyCol === "id") ? "cottage_" : "";
            row[keyCol] = `${prefix}${makeUuid()}`;
          }
          onSave(row);
        }}><FaSave /> Save Row</button>
      </div>
      <BucketLibraryModal
        open={bucketPicker.open}
        title={bucketPicker.title}
        folder={bucketPicker.folder}
        onCloseReason={(reason) => {
          setLastCloseReason(safeText(reason || "unknown"));
        }}
        onClose={() => {
          if (!lastCloseReason) setLastCloseReason("parent-toggle");
          setBucketPicker((p) => ({ ...p, open: false }));
        }}
        onPick={onPickFromBucket}
        onPickMany={onPickManyFromBucket}
      />
    </div>
  );
}

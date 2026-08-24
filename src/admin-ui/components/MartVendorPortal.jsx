import React, { useMemo, useState } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaLock,
  FaPlus,
  FaPowerOff,
  FaSortAmountDown,
  FaStore,
  FaSyncAlt,
  FaSearch,
  FaImage,
} from "react-icons/fa";

const PRODUCT_TYPE_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "veg", label: "Veg" },
  { key: "nonveg", label: "Non Veg" },
  { key: "lowstock", label: "Low Stock" },
  { key: "inactive", label: "Inactive" }
];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function parseMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
}

function parseIntSafe(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  const text = safeText(raw);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeQuantityOption(seed = "") {
  const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: seed || `qty_${suffix}`,
    label: "",
    vendor_price: "",
    price: "",
    mrp: "",
    stock: "",
    is_default: false,
    available: true
  };
}

function makeProductId(seed = "mprod") {
  return `${seed}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuantityOptionForm(option, index = 0) {
  const src = option && typeof option === "object" ? option : {};
  return {
    id: safeText(src.id) || `qty_${index + 1}`,
    label: safeText(src.label || src.unit || src.name || src.title),
    vendor_price: String(parseMoney(src.vendor_price ?? src.vendorPrice ?? src.cost_price ?? src.costPrice ?? src.base_price ?? src.basePrice)),
    price: String(parseMoney(src.price ?? src.customer_price ?? src.customerPrice)),
    mrp: String(parseMoney(src.mrp)),
    stock: String(parseIntSafe(src.stock, 0)),
    is_default: src.is_default === true || src.isDefault === true || index === 0,
    available: src.available !== false
  };
}

function ensureQuantityOptions(rawOptions, fallback = {}, { preserveEmpty = false } = {}) {
  const normalized = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) => normalizeQuantityOptionForm(option, index))
    .filter((option) => {
      if (preserveEmpty) return true;
      return (
        safeText(option.label) ||
        parseMoney(option.vendor_price) > 0 ||
        parseMoney(option.price) > 0 ||
        parseMoney(option.mrp) > 0 ||
        parseIntSafe(option.stock, 0) > 0
      );
    });
  if (normalized.length) {
    const hasDefault = normalized.some((option) => option.is_default);
    return normalized.map((option, index) => ({
      ...option,
      is_default: hasDefault ? option.is_default : index === 0
    }));
  }
  return [{
    ...makeQuantityOption("qty_1"),
    label: safeText(fallback.unit),
    vendor_price: String(parseMoney(fallback.price)),
    price: String(parseMoney(fallback.customer_price)),
    mrp: String(parseMoney(fallback.mrp)),
    stock: String(parseIntSafe(fallback.stock, 0)),
    is_default: true,
    available: true
  }];
}

function syncQuantityOptionsFromFormFields(form) {
  const quantityOptions = ensureQuantityOptions(form?.quantity_options, form, { preserveEmpty: true });
  const defaultIndex = Math.max(0, quantityOptions.findIndex((option) => option?.is_default));
  const nextQuantityOptions = quantityOptions.map((option, index) => (
    index === defaultIndex
      ? {
          ...option,
          label: safeText(form?.unit) || option.label,
          vendor_price: String(parseMoney(form?.price || option.vendor_price)),
          price: String(parseMoney(form?.customer_price || option.price)),
          mrp: String(parseMoney(form?.mrp || option.mrp)),
          stock: String(parseIntSafe(form?.stock ?? option.stock, 0)),
          is_default: true
        }
      : option
  ));
  return {
    ...form,
    quantity_options: nextQuantityOptions
  };
}

function syncLegacyFieldsFromQuantityOptions(form) {
  const quantityOptions = ensureQuantityOptions(form?.quantity_options, form, { preserveEmpty: true });
  const primary = quantityOptions.find((option) => option.is_default) || quantityOptions[0] || makeQuantityOption("qty_1");
  return {
    ...form,
    quantity_options: quantityOptions,
    unit: safeText(primary.label),
    price: String(parseMoney(primary.vendor_price || form?.price)),
    customer_price: String(parseMoney(primary.price)),
    mrp: String(parseMoney(primary.mrp)),
    stock: String(parseIntSafe(primary.stock, 0))
  };
}

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  category_id: "",
  unit: "",
  price: "",
  ev_percentage: "",
  customer_price: "",
  mrp: "",
  stock: "",
  max_per_order: "10",
  is_veg: false,
  available: true,
  image: "",
  quantity_options: [{ ...makeQuantityOption("qty_1"), is_default: true }]
};

const MART_CATEGORY_OPTIONS = [
  "Beverages",
  "Biscuits",
  "Chocolates & Candies",
  "Cooking Essentials",
  "Dairy, Bread & Butter",
  "Fruits & Vegetables",
  "Health & Hygiene",
  "Home & Cleaning",
  "Ice Cream & Desserts",
  "Munchies",
  "Packaged Food",
  "Personal Care",
  "Tools"
];

const INVENTORY_COLUMN_KEYS = [
  "image_upload",
  "product",
  "description",
  "category",
  "type",
  "unit",
  "vendor_price",
  "ev_percentage",
  "customer_price",
  "mrp",
  "discount",
  "stock",
  "status"
];

function parseVisibleInventoryColumns(raw) {
  if (Array.isArray(raw)) {
    const list = raw.map((x) => safeText(x)).filter(Boolean);
    return Array.from(new Set(list));
  }
  const text = safeText(raw);
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const list = parsed.map((x) => safeText(x)).filter(Boolean);
        return Array.from(new Set(list));
      }
    } catch {
      // Fall back to comma-separated parsing.
    }
  }
  const parts = text.split(",").map((x) => safeText(x)).filter(Boolean);
  return Array.from(new Set(parts));
}

function parseCustomCategoryOptions(raw) {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((x) => safeText(x)).filter(Boolean)));
  }
  const text = safeText(raw);
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((x) => safeText(x)).filter(Boolean)));
      }
    } catch {
      // Fall back to comma-separated parsing.
    }
  }
  return Array.from(new Set(text.split(",").map((x) => safeText(x)).filter(Boolean)));
}

function resolveDisplayImageUrl(value) {
  const raw = safeText(value);
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

function rowToForm(row) {
  const quantityOptions = ensureQuantityOptions(
    parseJsonArray(row?.quantity_options ?? row?.quantityOptions ?? row?.variants),
    {
      unit: safeText(row?.unit || row?.capacity || row?.size),
      price: parseMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice),
      customer_price: parseMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice ?? row?.price),
      mrp: parseMoney(row?.mrp),
      stock: parseIntSafe(row?.stock, 0)
    }
  );
  return syncLegacyFieldsFromQuantityOptions(syncQuantityOptionsFromFormFields({
    id: safeText(row?.id),
    name: safeText(row?.name),
    description: safeText(row?.description),
    category_id: safeText(row?.category_id || row?.categoryId),
    unit: safeText(row?.unit || row?.capacity || row?.size),
    price: String(parseMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice)),
    ev_percentage: String(parseMoney(row?.ev_percentage ?? row?.ev_percent ?? row?.evPercent)),
    customer_price: String(parseMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice ?? row?.price)),
    mrp: String(parseMoney(row?.mrp)),
    stock: String(parseIntSafe(row?.stock, 0)),
    max_per_order: String(parseIntSafe(row?.max_per_order ?? row?.maxPerOrder, 10) || 10),
    is_veg: row?.is_veg === true || row?.isVeg === true,
    available: row?.available !== false,
    image: safeText(row?.image || row?.image_url || row?.imageUrl || row?.photo),
    quantity_options: quantityOptions
  }));
}

function formToPayload(form) {
  const synced = syncLegacyFieldsFromQuantityOptions(syncQuantityOptionsFromFormFields(form));
  const rawQuantityOptions = ensureQuantityOptions(synced.quantity_options, synced, { preserveEmpty: true })
    .filter((option) => safeText(option.label))
    .map((option, index) => ({
      id: safeText(option.id) || `qty_${index + 1}`,
      label: safeText(option.label),
      unit: safeText(option.label),
      vendor_price: parseMoney(option.vendor_price ?? option.vendorPrice ?? synced.price),
      price: parseMoney(option.price),
      mrp: parseMoney(option.mrp),
      stock: parseIntSafe(option.stock, 0),
      is_default: option.is_default === true,
      available: option.available !== false
    }));
  const hasExplicitDefault = rawQuantityOptions.some((option) => option.is_default);
  const normalizedQuantityOptions = rawQuantityOptions.map((option, index) => ({
    ...option,
    is_default: hasExplicitDefault ? option.is_default : index === 0
  }));
  const primary = normalizedQuantityOptions.find((option) => option.is_default) || normalizedQuantityOptions[0] || null;
  return {
    ...form,
    category_id: safeText(form.category_id) || "uncategorized",
    unit: safeText(primary?.label || synced.unit),
    price: parseMoney(primary?.vendor_price ?? form.price),
    ev_percentage: parseMoney(form.ev_percentage),
    customer_price: parseMoney(primary?.price ?? synced.customer_price),
    mrp: parseMoney(primary?.mrp ?? synced.mrp),
    stock: parseIntSafe(primary?.stock ?? synced.stock, 0),
    max_per_order: parseIntSafe(form.max_per_order, 10) || 10,
    is_veg: !!form.is_veg,
    available: form.available !== false,
    image: safeText(form.image),
    quantity_options: normalizedQuantityOptions
  };
}

function quantitySummary(row) {
  const quantityOptions = ensureQuantityOptions(
    parseJsonArray(row?.quantity_options ?? row?.quantityOptions ?? row?.variants),
    row
  ).filter((option) => safeText(option.label));
  if (!quantityOptions.length) return safeText(row?.unit || row?.capacity || row?.size) || "—";
  if (quantityOptions.length === 1) return safeText(quantityOptions[0].label) || "—";
  return `${safeText(quantityOptions[0].label)} +${quantityOptions.length - 1} more`;
}

function rowToQuantityOption(row, index = 0) {
  const unitLabel = safeText(row?.unit || row?.capacity || row?.size || row?.label || row?.name || row?.title);
  return {
    id: safeText(row?.id) || `qty_${index + 1}`,
    label: unitLabel || `Option ${index + 1}`,
    vendor_price: String(parseMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice)),
    price: String(parseMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice ?? row?.price)),
    mrp: String(parseMoney(row?.mrp)),
    stock: String(parseIntSafe(row?.stock, 0)),
    is_default: index === 0,
    available: row?.available !== false
  };
}

async function vendorHttp(path, init) {
  const r = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...((init && init.headers) || {})
    }
  });
  const text = await r.text().catch(() => "");
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!r.ok) {
    const msg = safeText(payload?.error || payload?.message || text || `HTTP_${r.status}`);
    throw new Error(msg);
  }
  return payload;
}

async function vendorHttpForm(path, formData) {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  const text = await r.text().catch(() => "");
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!r.ok) {
    const msg = safeText(payload?.error || payload?.message || text || `HTTP_${r.status}`);
    throw new Error(msg);
  }
  return payload;
}

export default function MartVendorPortal({
  mode = "vendor",
  vendor: controlledVendor = null,
  products: controlledProducts = [],
  catalogProducts: controlledCatalogProducts = [],
  loading = false,
  adminBannerError = "",
  onOpenColumnsDialog,
  onOpenCategoryImages,
  onUpsertRows,
  onSaveCustomCategories,
  onDeleteProduct,
  onBulkDeleteProducts,
  onUploadImage
}) {
  const isEmbeddedAdmin = mode === "admin";
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const [inlineAddOpen, setInlineAddOpen] = useState(false);
  const [inlineAddForm, setInlineAddForm] = useState(EMPTY_FORM);
  const [inlineRowDrafts, setInlineRowDrafts] = useState({});
  const [quantityModalRowId, setQuantityModalRowId] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedQuantitySourceIds, setSelectedQuantitySourceIds] = useState([]);
  // Confirmations are rendered in the page instead of window.confirm. A tab
  // that has had "prevent this page from creating additional dialogs" ticked
  // - or any embedded webview - gets false back from confirm() with nothing
  // shown, so Delete simply stopped responding with no error to explain it.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageDraft, setPageDraft] = useState("1");
  const [autoSaving, setAutoSaving] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 900 : false));
  const PAGE_SIZE = 20;
  const autosaveTimersRef = React.useRef(new Map());

  React.useEffect(() => {
    if (!isEmbeddedAdmin) return;
    setVendor(controlledVendor || null);
    setProducts(Array.isArray(controlledProducts) ? controlledProducts : []);
    setCatalogProducts(Array.isArray(controlledCatalogProducts) ? controlledCatalogProducts : []);
  }, [isEmbeddedAdmin, controlledVendor, controlledProducts, controlledCatalogProducts]);

  React.useEffect(() => {
    const raw =
      vendor?.inventory_custom_categories ??
      vendor?.custom_categories ??
      vendor?.category_options ??
      vendor?.categories;
    setCustomCategories(parseCustomCategoryOptions(raw));
  }, [vendor]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  React.useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => () => {
    autosaveTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    autosaveTimersRef.current.clear();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = safeText(search).toLowerCase();
    let list = Array.isArray(products) ? products.slice() : [];
    if (typeFilter === "veg") list = list.filter((p) => p?.is_veg === true || p?.isVeg === true);
    if (typeFilter === "nonveg") list = list.filter((p) => !(p?.is_veg === true || p?.isVeg === true));
    if (typeFilter === "inactive") list = list.filter((p) => p?.available === false);
    if (typeFilter === "lowstock") list = list.filter((p) => parseIntSafe(p?.stock, 0) <= 5);
    if (q) list = list.filter((p) => JSON.stringify(p).toLowerCase().includes(q));
    list.sort((a, b) => {
      const aHasImage = !!safeText(a?.image || a?.image_url || a?.imageUrl || "");
      const bHasImage = !!safeText(b?.image || b?.image_url || b?.imageUrl || "");
      const ap = parseMoney(a?.customer_price ?? a?.customerPrice ?? a?.selling_price ?? a?.sellingPrice ?? a?.price);
      const bp = parseMoney(b?.customer_price ?? b?.customerPrice ?? b?.selling_price ?? b?.sellingPrice ?? b?.price);
      const aAvailable = a?.available !== false;
      const bAvailable = b?.available !== false;
      if (sortBy === "no_image_first" && aHasImage !== bHasImage) return aHasImage ? 1 : -1;
      if (sortBy === "with_image_first" && aHasImage !== bHasImage) return aHasImage ? -1 : 1;
      if (sortBy === "available_first" && aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      if (sortBy === "unavailable_first" && aAvailable !== bAvailable) return aAvailable ? 1 : -1;
      if (sortBy === "price_low") return ap - bp;
      if (sortBy === "price_high") return bp - ap;
      if (sortBy === "stock_low") return parseIntSafe(a?.stock, 0) - parseIntSafe(b?.stock, 0);
      if (sortBy === "stock_high") return parseIntSafe(b?.stock, 0) - parseIntSafe(a?.stock, 0);
      return safeText(a?.name).localeCompare(safeText(b?.name));
    });
    return list;
  }, [products, search, typeFilter, sortBy]);

  const categoryOptions = useMemo(() => {
    const merged = [
      ...MART_CATEGORY_OPTIONS,
      ...customCategories,
      ...(Array.isArray(products) ? products.map((x) => safeText(x?.category_id || x?.categoryId)) : []),
    ].map((x) => safeText(x)).filter(Boolean);
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [customCategories, products]);

  const productNameOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    [...(Array.isArray(products) ? products : []), ...(Array.isArray(catalogProducts) ? catalogProducts : [])].forEach((row) => {
      const name = safeText(row?.name || row?.title);
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(name);
    });
    return out.sort((a, b) => a.localeCompare(b));
  }, [products, catalogProducts]);

  const sharedImageByName = useMemo(() => {
    const map = new Map();
    [...(Array.isArray(catalogProducts) ? catalogProducts : []), ...(Array.isArray(products) ? products : [])].forEach((row) => {
      const name = safeText(row?.name || row?.title);
      if (!name) return;
      const image = safeText(row?.image || row?.image_url || row?.imageUrl || row?.photo || "");
      if (!image) return;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, image);
    });
    return map;
  }, [catalogProducts, products]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = useMemo(
    () => filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProducts, safePage]
  );
  const visibleSelectionIds = useMemo(
    () => pagedProducts.map((row) => safeText(row?.id)).filter(Boolean),
    [pagedProducts]
  );
  const allVisibleSelected = visibleSelectionIds.length > 0 && visibleSelectionIds.every((id) => selectedQuantitySourceIds.includes(id));

  const stats = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const active = list.filter((x) => x?.available !== false).length;
    const veg = list.filter((x) => x?.is_veg === true || x?.isVeg === true).length;
    const lowStock = list.filter((x) => parseIntSafe(x?.stock, 0) <= 5).length;
    return { total: list.length, active, veg, lowStock };
  }, [products]);

  const visibleInventoryColumns = useMemo(() => {
    const raw =
      vendor?.inventory_visible_columns ??
      vendor?.inventory_columns ??
      vendor?.visible_columns ??
      vendor?.vendor_columns;
    const parsed = parseVisibleInventoryColumns(raw);
    const picked = parsed.filter((key) => INVENTORY_COLUMN_KEYS.includes(key));
    return new Set(["image_upload", ...(picked.length ? picked : INVENTORY_COLUMN_KEYS)]);
  }, [vendor]);
  const showColumn = (key) => visibleInventoryColumns.has(key);
  const visibleDataColumnCount = INVENTORY_COLUMN_KEYS.filter((k) => showColumn(k)).length;

  const loadSnapshot = async ({ resetPage = false } = {}) => {
    if (isEmbeddedAdmin) {
      if (resetPage) setPage(1);
      return;
    }
    const data = await vendorHttp(`/api/mart-vendor/snapshot?_=${Date.now()}`);
    setVendor(data?.vendor || null);
    setProducts(Array.isArray(data?.products) ? data.products : []);
    setCatalogProducts(Array.isArray(data?.catalog) ? data.catalog : []);
    if (resetPage) setPage(1);
  };

  React.useEffect(() => {
    setPage((prev) => {
      const bounded = Math.min(Math.max(prev, 1), totalPages);
      return prev === bounded ? prev : bounded;
    });
  }, [totalPages]);

  React.useEffect(() => {
    setPageDraft(String(safePage));
  }, [safePage]);

  const onProductNameChange = (setF, value) => {
    const typedName = value;
    const commonImage = sharedImageByName.get(safeText(typedName).toLowerCase()) || "";
    setF((p) => ({
      ...p,
      name: typedName,
      image: commonImage || p.image
    }));
  };

  React.useEffect(() => {
    if (isEmbeddedAdmin) {
      setBooting(false);
      setAuthed(true);
      return undefined;
    }
    let alive = true;
    (async () => {
      setBooting(true);
      try {
        await vendorHttp("/api/mart-vendor/auth/session");
        if (!alive) return;
        setAuthed(true);
        await loadSnapshot({ resetPage: true });
      } catch {
        if (!alive) return;
        setAuthed(false);
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => { alive = false; };
  }, [isEmbeddedAdmin]);

  const onLogin = async (e) => {
    e.preventDefault();
    if (!safeText(credentials.username) || !safeText(credentials.password)) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await vendorHttp("/api/mart-vendor/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: credentials.username, password: credentials.password })
      });
      setAuthed(true);
      setCredentials((p) => ({ ...p, password: "" }));
      await loadSnapshot({ resetPage: true });
    } catch (err) {
      setError(String(err?.message || err || "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await vendorHttp("/api/mart-vendor/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout transport failures.
    } finally {
      setAuthed(false);
      setVendor(null);
      setProducts([]);
      setCatalogProducts([]);
      setBusy(false);
    }
  };

  const startAdd = () => {
    setInlineAddOpen(true);
    setInlineAddForm({ ...EMPTY_FORM });
    setSelectedQuantitySourceIds([]);
    setError("");
    setSuccess("");
  };

  const persistRowDraft = async (rowId, form) => {
    if (!safeText(form?.name)) {
      setError("Product name is required before saving.");
      return false;
    }
    const quantityOptions = ensureQuantityOptions(form?.quantity_options, form, { preserveEmpty: true });
    const invalidQuantityOption = quantityOptions.find((option) => {
      const hasEnteredData =
        parseMoney(option?.vendor_price) > 0 ||
        parseMoney(option?.price) > 0 ||
        parseMoney(option?.mrp) > 0 ||
        parseIntSafe(option?.stock, 0) > 0;
      return hasEnteredData && !safeText(option?.label);
    });
    if (invalidQuantityOption) {
      setError("Add quantity labels before saving.");
      return false;
    }
    setAutoSaving(true);
    setError("");
    try {
      const payload = formToPayload(form);
      const rows = [{
        ...payload,
        id: safeText(payload.id) || makeProductId()
      }];
      let savedRows = rows;
      if (isEmbeddedAdmin) {
        if (typeof onUpsertRows !== "function") throw new Error("Admin upsert handler missing.");
        const result = await onUpsertRows(rows);
        if (Array.isArray(result) && result.length) savedRows = result;
      } else {
        const response = await vendorHttp("/api/mart-vendor/products/upsert", {
          method: "POST",
          body: JSON.stringify({ rows })
        });
        if (Array.isArray(response?.rows) && response.rows.length) savedRows = response.rows;
      }
      const savedRow = savedRows[0] || rows[0];
      const normalizedForm = rowToForm(savedRow);
      if (safeText(normalizedForm.category_id)) {
        setCustomCategories((prev) => prev.includes(safeText(normalizedForm.category_id)) ? prev : [...prev, safeText(normalizedForm.category_id)]);
      }
      setInlineRowDrafts((prev) => ({ ...prev, [rowId]: normalizedForm }));
      await loadSnapshot();
      return true;
    } catch (err) {
      setError(String(err?.message || err || "Could not save product"));
      return false;
    } finally {
      setAutoSaving(false);
    }
  };

  const ensureRowDraft = (row) => {
    const rowId = safeText(row?.id);
    return inlineRowDrafts[rowId] || rowToForm(row);
  };

  const updateRowDraft = (row, updater) => {
    const rowId = safeText(row?.id);
    setInlineRowDrafts((prev) => {
      const base = prev[rowId] || rowToForm(row);
      const next = typeof updater === "function" ? updater(base) : { ...base, ...updater };
      return { ...prev, [rowId]: next };
    });
  };

  const makeRowDraftSetter = (row) => (updater) => {
    updateRowDraft(row, updater);
  };

  const saveExistingRow = async (row) => {
    const rowId = safeText(row?.id);
    if (!rowId) return;
    setError("");
    setSuccess("");
    const saved = await persistRowDraft(rowId, ensureRowDraft(row));
    if (saved) setSuccess("Product saved successfully.");
  };

  const openQuantityModal = (row) => {
    const rowId = safeText(row?.id);
    if (!rowId) return;
    setQuantityModalRowId(rowId);
    setInlineRowDrafts((prev) => ({ ...prev, [rowId]: prev[rowId] || rowToForm(row) }));
  };

  const saveInline = async (form, isAdd) => {
    if (!safeText(form.name)) {
      setError("Product name is required.");
      return;
    }
    const quantityOptions = ensureQuantityOptions(form?.quantity_options, form, { preserveEmpty: true });
    const invalidQuantityOption = quantityOptions.find((option) => {
      const hasEnteredData =
        parseMoney(option?.vendor_price) > 0 ||
        parseMoney(option?.price) > 0 ||
        parseMoney(option?.mrp) > 0 ||
        parseIntSafe(option?.stock, 0) > 0;
      return hasEnteredData && !safeText(option?.label);
    });
    if (invalidQuantityOption) {
      setError("Each quantity option needs a label like 500 ml, 1 L, or 2 kg before saving.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = formToPayload(form);
      const rows = [{
        ...payload,
        id: safeText(payload.id) || makeProductId()
      }];
      if (isEmbeddedAdmin) {
        if (typeof onUpsertRows !== "function") throw new Error("Admin upsert handler missing.");
        await onUpsertRows(rows);
      } else {
        await vendorHttp("/api/mart-vendor/products/upsert", {
          method: "POST",
          body: JSON.stringify({ rows })
        });
      }
      if (safeText(form.category_id)) {
        setCustomCategories((prev) => prev.includes(safeText(form.category_id)) ? prev : [...prev, safeText(form.category_id)]);
      }
      setInlineAddOpen(false);
      await loadSnapshot();
      setSuccess(isAdd ? "Product added successfully." : "Product updated successfully.");
    } catch (err) {
      setError(String(err?.message || err || "Could not save product"));
    } finally {
      setBusy(false);
    }
  };

  const uploadImageForForm = async (file, setter) => {
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      let url = "";
      if (isEmbeddedAdmin) {
        if (typeof onUploadImage !== "function") throw new Error("Admin upload handler missing.");
        const uploaded = await onUploadImage(file);
        url = safeText(uploaded?.url || uploaded);
      } else {
        const fd = new FormData();
        fd.append("image", file);
        const j = await vendorHttpForm("/api/mart-vendor/products/upload-image", fd);
        url = safeText(j?.url);
      }
      if (!url) throw new Error("Upload failed");
      setter((p) => ({ ...p, image: url }));
      setSuccess("Image uploaded.");
    } catch (err) {
      setError(String(err?.message || err || "Image upload failed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteProduct = async (row) => {
    const id = safeText(row?.id);
    if (!id) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (isEmbeddedAdmin) {
        if (typeof onDeleteProduct !== "function") throw new Error("Admin delete handler missing.");
        await onDeleteProduct(id, row);
      } else {
        await vendorHttp("/api/mart-vendor/products/delete", {
          method: "POST",
          body: JSON.stringify({ id })
        });
      }
      await loadSnapshot();
      setInlineRowDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (safeText(quantityModalRowId) === id) {
        setQuantityModalRowId("");
      }
      setSuccess("Product removed.");
    } catch (err) {
      setError(String(err?.message || err || "Delete failed"));
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailability = async (row) => {
    const rowId = safeText(row?.id);
    if (!rowId) return;
    const baseForm = ensureRowDraft(row);
    const nextAvailable = !(baseForm?.available !== false);
    const nextForm = {
      ...baseForm,
      available: nextAvailable
    };
    const existing = autosaveTimersRef.current.get(rowId);
    if (existing) {
      window.clearTimeout(existing);
      autosaveTimersRef.current.delete(rowId);
    }
    setInlineRowDrafts((prev) => ({ ...prev, [rowId]: nextForm }));
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await persistRowDraft(rowId, nextForm);
      if (!saved) throw new Error("Availability update failed");
      setSuccess(`Product ${nextAvailable ? "enabled" : "disabled"} successfully.`);
    } catch (err) {
      setInlineRowDrafts((prev) => ({ ...prev, [rowId]: baseForm }));
      setError(String(err?.message || err || "Availability update failed"));
    } finally {
      setBusy(false);
    }
  };

  const renderAvailabilityCheckbox = (row, available, setDraft) => (
    <label className="mv-availability-check">
      <input
        type="checkbox"
        checked={available}
        aria-label={`${available ? "Disable" : "Enable"} ${safeText(row?.name) || "product"}`}
        onChange={(e) => {
          if (typeof setDraft === "function") {
            setDraft((p) => ({ ...p, available: e.target.checked }));
          } else {
            toggleAvailability(row);
          }
        }}
        disabled={busy || autoSaving}
      />
      <span>Available</span>
    </label>
  );

  const addCategory = async () => {
    const cat = safeText(newCategoryName);
    if (!cat) return;
    const nextCategories = Array.from(new Set([...customCategories, cat]));
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (typeof onSaveCustomCategories === "function") {
        await onSaveCustomCategories(nextCategories);
      } else if (!isEmbeddedAdmin) {
        await vendorHttp("/api/mart-vendor/custom-categories", {
          method: "POST",
          body: JSON.stringify({ categories: nextCategories })
        });
      }
      setCustomCategories(nextCategories);
      if (!isEmbeddedAdmin) {
        await loadSnapshot();
      }
    } catch (err) {
      setError(String(err?.message || err || "Could not save category"));
      return;
    } finally {
      setBusy(false);
    }
    if (inlineAddOpen && !safeText(inlineAddForm.category_id)) {
      setInlineAddForm((p) => ({ ...p, category_id: cat }));
    }
    setNewCategoryName("");
    setSuccess(`Category added: ${cat}`);
  };

  const updateQuantityOptions = (setF, updater) => {
    setF((prev) => {
      const current = ensureQuantityOptions(prev?.quantity_options, prev, { preserveEmpty: true });
      const nextRaw = typeof updater === "function" ? updater(current) : current;
      return syncLegacyFieldsFromQuantityOptions({
        ...prev,
        quantity_options: ensureQuantityOptions(nextRaw, prev, { preserveEmpty: true })
      });
    });
  };

  const toggleQuantitySourceSelection = (productId) => {
    const id = safeText(productId);
    if (!id) return;
    setSelectedQuantitySourceIds((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };

  const buildQuantityOptionsFromSelection = (form, setF) => {
    const selectedRows = selectedQuantitySourceIds
      .map((id) => (Array.isArray(products) ? products.find((row) => safeText(row?.id) === id) : null))
      .filter(Boolean);
    if (!selectedRows.length) {
      setError("Choose at least one uploaded product to build quantity options.");
      return;
    }
    const nextQuantityOptions = selectedRows.map((row, index) => rowToQuantityOption(row, index));
    const firstRow = selectedRows[0];
    setF((prev) => syncLegacyFieldsFromQuantityOptions({
      ...prev,
      name: safeText(prev?.name) || safeText(firstRow?.name),
      category_id: safeText(prev?.category_id) || safeText(firstRow?.category_id || firstRow?.categoryId),
      image: safeText(prev?.image) || safeText(firstRow?.image),
      is_veg: prev?.is_veg === true || firstRow?.is_veg === true || firstRow?.isVeg === true,
      quantity_options: nextQuantityOptions
    }));
    setSuccess(`${selectedRows.length} quantity option${selectedRows.length === 1 ? "" : "s"} linked from uploaded products.`);
  };

  const mergeSelectedProducts = async () => {
    const selectedRows = selectedQuantitySourceIds
      .map((id) => (Array.isArray(products) ? products.find((row) => safeText(row?.id) === id) : null))
      .filter(Boolean);
    if (selectedRows.length < 2) {
      setError("Check at least 2 products before merging quantity options.");
      return;
    }
    const baseRow = selectedRows[0];
    const quantityOptions = selectedRows.map((row, index) => rowToQuantityOption(row, index));
    const mergedForm = syncLegacyFieldsFromQuantityOptions({
      ...rowToForm(baseRow),
      image: safeText(baseRow?.image),
      quantity_options: quantityOptions
    });
    const payload = formToPayload(mergedForm);
    const extraRows = selectedRows.slice(1);

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const normalizedPayload = {
        ...payload,
        id: safeText(payload.id) || makeProductId()
      };
      if (isEmbeddedAdmin) {
        if (typeof onUpsertRows !== "function") throw new Error("Admin upsert handler missing.");
        await onUpsertRows([normalizedPayload]);
      } else {
        await vendorHttp("/api/mart-vendor/products/upsert", {
          method: "POST",
          body: JSON.stringify({ rows: [normalizedPayload] })
        });
      }
      for (const row of extraRows) {
        if (isEmbeddedAdmin) {
          if (typeof onDeleteProduct !== "function") throw new Error("Admin delete handler missing.");
          await onDeleteProduct(safeText(row?.id), row);
        } else {
          await vendorHttp("/api/mart-vendor/products/delete", {
            method: "POST",
            body: JSON.stringify({ id: safeText(row?.id) })
          });
        }
      }
      setSelectedQuantitySourceIds([]);
      setInlineAddOpen(false);
      await loadSnapshot({ resetPage: true });
      setSuccess(`Merged ${selectedRows.length} products into ${safeText(baseRow?.name) || "one product"} with one shared image.`);
    } catch (err) {
      setError(String(err?.message || err || "Could not merge selected products"));
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectAllVisible = () => {
    if (!visibleSelectionIds.length) return;
    setSelectedQuantitySourceIds((prev) => {
      if (visibleSelectionIds.every((id) => prev.includes(id))) {
        return prev.filter((id) => !visibleSelectionIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleSelectionIds]));
    });
  };

  const clearSelectedProducts = () => {
    setSelectedQuantitySourceIds([]);
  };

  const bulkSetAvailability = async (nextAvailable) => {
    const selectedRows = selectedQuantitySourceIds
      .map((id) => (Array.isArray(products) ? products.find((row) => safeText(row?.id) === id) : null))
      .filter(Boolean);
    if (!selectedRows.length) {
      setError(`Select at least one product to ${nextAvailable ? "enable" : "disable"}.`);
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const rows = selectedRows.map((row) => ({ ...row, available: nextAvailable }));
      if (isEmbeddedAdmin) {
        if (typeof onUpsertRows !== "function") throw new Error("Admin upsert handler missing.");
        await onUpsertRows(rows);
      } else {
        await vendorHttp("/api/mart-vendor/products/upsert", {
          method: "POST",
          body: JSON.stringify({ rows })
        });
        await loadSnapshot();
      }
      setSelectedQuantitySourceIds([]);
      setSuccess(`${selectedRows.length} product${selectedRows.length === 1 ? "" : "s"} ${nextAvailable ? "enabled" : "disabled"} successfully.`);
    } catch (err) {
      setError(String(err?.message || err || "Bulk availability update failed"));
    } finally {
      setBusy(false);
    }
  };

  const bulkDeleteSelectedProducts = async () => {
    const selectedRows = selectedQuantitySourceIds
      .map((id) => (Array.isArray(products) ? products.find((row) => safeText(row?.id) === id) : null))
      .filter(Boolean);
    if (!selectedRows.length) {
      setError("Select at least one product to delete.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (isEmbeddedAdmin) {
        if (typeof onBulkDeleteProducts === "function") {
          await onBulkDeleteProducts(selectedRows);
        } else if (typeof onDeleteProduct === "function") {
          for (const row of selectedRows) {
            await onDeleteProduct(safeText(row?.id), row);
          }
        } else {
          throw new Error("Admin delete handler missing.");
        }
      } else {
        await Promise.all(selectedRows.map((row) => vendorHttp("/api/mart-vendor/products/delete", {
          method: "POST",
          body: JSON.stringify({ id: safeText(row?.id) })
        })));
        await loadSnapshot({ resetPage: true });
      }
      setInlineRowDrafts((prev) => {
        const next = { ...prev };
        selectedRows.forEach((row) => {
          delete next[safeText(row?.id)];
        });
        return next;
      });
      setSelectedQuantitySourceIds([]);
      setSuccess(`${selectedRows.length} product${selectedRows.length === 1 ? "" : "s"} deleted successfully.`);
    } catch (err) {
      setError(String(err?.message || err || "Bulk delete failed"));
    } finally {
      setBusy(false);
    }
  };

  const addQuantityOption = (setF) => {
    updateQuantityOptions(setF, (options) => [...options, makeQuantityOption()]);
  };

  const updateQuantityOptionField = (setF, index, field, value) => {
    updateQuantityOptions(setF, (options) =>
      options.map((option, optionIndex) =>
        optionIndex === index
          ? { ...option, [field]: value }
          : option
      )
    );
  };

  const setDefaultQuantityOption = (setF, index) => {
    updateQuantityOptions(setF, (options) =>
      options.map((option, optionIndex) => ({
        ...option,
        is_default: optionIndex === index
      }))
    );
  };

  const removeQuantityOption = (setF, index) => {
    updateQuantityOptions(setF, (options) => {
      if (options.length <= 1) return options;
      const next = options.filter((_, optionIndex) => optionIndex !== index);
      if (!next.some((option) => option.is_default) && next[0]) {
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
  };

  const renderQuantityEditor = (f, setF) => {
    const quantityOptions = ensureQuantityOptions(f?.quantity_options, f, { preserveEmpty: true });
    return (
      <div className="mv-quantity-editor" style={{ display: "grid", gap: 10, width: "100%", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#355246", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Choose Quantity Options
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="mv-btn small" type="button" onClick={() => buildQuantityOptionsFromSelection(f, setF)}>
              Use Checked Products
            </button>
            {selectedQuantitySourceIds.length ? (
              <button className="mv-btn small" type="button" onClick={() => setSelectedQuantitySourceIds([])}>
                Clear Checked
              </button>
            ) : null}
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {quantityOptions.map((option, index) => (
            <div
              key={option.id || `qty_${index + 1}`}
              style={{
                border: "1px solid rgba(18, 94, 71, 0.18)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.7)",
                padding: 10,
                display: "grid",
                gap: 8
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#1d4137" }}>
                  <input
                    type="radio"
                    name={`mv-default-qty-${safeText(f.id) || "new"}`}
                    checked={option.is_default === true}
                    onChange={() => setDefaultQuantityOption(setF, index)}
                  />
                  Default
                </label>
                <button
                  className="mv-btn small"
                  type="button"
                  onClick={() => removeQuantityOption(setF, index)}
                  disabled={quantityOptions.length <= 1}
                >
                  Remove
                </button>
              </div>
              <input
                className="mv-input"
                placeholder="Label e.g. 500 ml / 1 kg"
                value={option.label}
                onChange={(e) => updateQuantityOptionField(setF, index, "label", e.target.value)}
              />
              <div className="mv-quantity-fields" style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 800, color: "#5b6f68", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Vendor Price
                  <input
                    className="mv-input"
                    placeholder="Vendor price"
                    value={option.vendor_price}
                    onChange={(e) => updateQuantityOptionField(setF, index, "vendor_price", e.target.value)}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 800, color: "#5b6f68", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Customer Price
                  <input
                    className="mv-input"
                    placeholder="Customer price"
                    value={option.price}
                    onChange={(e) => updateQuantityOptionField(setF, index, "price", e.target.value)}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 800, color: "#5b6f68", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  MRP
                  <input
                    className="mv-input"
                    placeholder="MRP"
                    value={option.mrp}
                    onChange={(e) => updateQuantityOptionField(setF, index, "mrp", e.target.value)}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 800, color: "#5b6f68", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Stock
                  <input
                    className="mv-input"
                    placeholder="Stock"
                    value={option.stock}
                    onChange={(e) => updateQuantityOptionField(setF, index, "stock", e.target.value)}
                  />
                </label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#355246" }}>
                <input
                  type="checkbox"
                  checked={option.available !== false}
                  onChange={(e) => updateQuantityOptionField(setF, index, "available", e.target.checked)}
                />
                Available
              </label>
            </div>
          ))}
        </div>
        <button className="mv-btn small" type="button" onClick={() => addQuantityOption(setF)}>
          <FaPlus /> Add Quantity
        </button>
      </div>
    );
  };

  const discountText = (row) => {
    const mrp = parseMoney(row?.mrp);
    const cp = parseMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice ?? row?.price);
    if (mrp <= 0 || cp >= mrp) return "0%";
    return `${(((mrp - cp) / mrp) * 100).toFixed(1)}%`;
  };

  const renderEditableRow = (f, setF, onSave, onCancel, key) => (
    <tr key={key}>
      {showColumn("image_upload") ? <td>{renderImageEditor(f, setF, `${key}-desktop-new`)}</td> : null}
      {showColumn("product") ? (
      <td>
        <div className="mv-product-cell" style={{ alignItems: "flex-start", flexDirection: "column" }}>
          <input className="mv-input" placeholder="Product name" list="mv-product-name-options" value={f.name} onChange={(e) => onProductNameChange(setF, e.target.value)} />
        </div>
      </td>
      ) : null}
      {showColumn("description") ? <td><textarea className="mv-input mv-description-input" value={f.description || ""} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} /></td> : null}
      {showColumn("category") ? (
      <td>
        <select className="mv-input" value={f.category_id} onChange={(e) => setF((p) => ({ ...p, category_id: e.target.value }))}>
          <option value="">Select category</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </td>
      ) : null}
      {showColumn("type") ? (
      <td>
        <select className="mv-input" value={f.is_veg ? "yes" : "no"} onChange={(e) => setF((p) => ({ ...p, is_veg: e.target.value === "yes" }))}>
          <option value="yes">Veg</option>
          <option value="no">Non Veg</option>
        </select>
      </td>
      ) : null}
      {showColumn("unit") ? <td>{renderQuantityEditor(f, setF)}</td> : null}
      {showColumn("vendor_price") ? <td><input className="mv-input" value={f.price} readOnly title="Derived from the default quantity option" /></td> : null}
      {showColumn("ev_percentage") ? <td><input className="mv-input" value={f.ev_percentage} onChange={(e) => setF((p) => ({ ...p, ev_percentage: e.target.value }))} /></td> : null}
      {showColumn("customer_price") ? <td><input className="mv-input" value={f.customer_price} readOnly title="Derived from the default quantity option" /></td> : null}
      {showColumn("mrp") ? <td><input className="mv-input" value={f.mrp} readOnly title="Derived from the default quantity option" /></td> : null}
      {showColumn("discount") ? <td>{discountText(f)}</td> : null}
      {showColumn("stock") ? <td><input className="mv-input" value={f.stock} readOnly title="Derived from the default quantity option" /></td> : null}
      {showColumn("status") ? (
      <td>
        <select className="mv-input" value={f.available ? "yes" : "no"} onChange={(e) => setF((p) => ({ ...p, available: e.target.value === "yes" }))}>
          <option value="yes">Active</option>
          <option value="no">Inactive</option>
        </select>
      </td>
      ) : null}
      <td className="mv-actions-cell">
        <button className="mv-btn small mv-btn-primary" onClick={onSave} type="button" disabled={busy}>Save</button>
        <button className="mv-btn small" onClick={onCancel} type="button" disabled={busy}>Cancel</button>
      </td>
    </tr>
  );

  const renderEditableCard = (f, setF, onSave, onCancel, key) => (
    <div key={key} className="mv-mobile-card">
      <div className="mv-mobile-edit-grid">
        {showColumn("image_upload") ? renderImageEditor(f, setF, `${key}-mobile-new`) : null}
        {showColumn("product") ? (
          <>
            <input className="mv-input" placeholder="Product name" list="mv-product-name-options" value={f.name} onChange={(e) => onProductNameChange(setF, e.target.value)} />
          </>
        ) : null}
        {showColumn("description") ? <textarea className="mv-input mv-description-input" value={f.description || ""} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} /> : null}
        {showColumn("category") ? (
          <select className="mv-input" value={f.category_id} onChange={(e) => setF((p) => ({ ...p, category_id: e.target.value }))}>
            <option value="">Select category</option>
            {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        ) : null}
        {showColumn("type") ? (
          <select className="mv-input" value={f.is_veg ? "yes" : "no"} onChange={(e) => setF((p) => ({ ...p, is_veg: e.target.value === "yes" }))}>
            <option value="yes">Veg</option>
            <option value="no">Non Veg</option>
          </select>
        ) : null}
                  {showColumn("unit") ? renderQuantityEditor(f, setF) : null}
        {showColumn("vendor_price") ? <input className="mv-input" value={f.price} readOnly title="Derived from the default quantity option" placeholder="Vendor price" /> : null}
        {showColumn("ev_percentage") ? <input className="mv-input" value={f.ev_percentage} onChange={(e) => setF((p) => ({ ...p, ev_percentage: e.target.value }))} placeholder="EV %" /> : null}
        {showColumn("customer_price") ? <input className="mv-input" value={f.customer_price} readOnly title="Derived from the default quantity option" placeholder="Customer price" /> : null}
        {showColumn("mrp") ? <input className="mv-input" value={f.mrp} readOnly title="Derived from the default quantity option" placeholder="MRP" /> : null}
        {showColumn("stock") ? <input className="mv-input" value={f.stock} readOnly title="Derived from the default quantity option" placeholder="Stock" /> : null}
        {showColumn("status") ? (
          <select className="mv-input" value={f.available ? "yes" : "no"} onChange={(e) => setF((p) => ({ ...p, available: e.target.value === "yes" }))}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        ) : null}
      </div>
      <div className="mv-actions-cell">
        <button className="mv-btn small mv-btn-primary" onClick={onSave} type="button" disabled={busy}>Save</button>
        <button className="mv-btn small" onClick={onCancel} type="button" disabled={busy}>Cancel</button>
      </div>
    </div>
  );

  const renderImageEditor = (f, setF, inputKey) => {
    const uploadInputId = `mv-image-upload-${safeText(inputKey) || "new"}`;
    return (
      <div className="mv-upload-row">
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            id={uploadInputId}
            className="hidden-input"
            type="file"
            accept="image/*,.heic,.heif,.avif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImageForForm(file, setF);
              e.target.value = "";
            }}
            disabled={uploadingImage}
          />
          <button
            className="mv-btn small"
            type="button"
            onClick={() => {
              const input = document.getElementById(uploadInputId);
              if (input && typeof input.click === "function") input.click();
            }}
            disabled={uploadingImage}
          >
            {uploadingImage ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    );
  };

  const displayBooting = isEmbeddedAdmin ? loading : booting;
  const displayAuthed = isEmbeddedAdmin ? !!vendor : authed;

  if (displayBooting) return <div className="mv-shell"><div className="mv-card">{isEmbeddedAdmin ? "Loading mart vendor workspace..." : "Checking secure vendor session..."}</div></div>;

  if (!displayAuthed) {
    if (isEmbeddedAdmin) {
      return (
        <div className="mv-shell">
          <div className="mv-card">Select a mart vendor from the sidebar panel above to load the full vendor workspace.</div>
        </div>
      );
    }
    return (
      <div className="mv-shell">
        <div className="mv-login-card">
          <div className="mv-logo"><FaStore /> ExploreValley Vendor Portal</div>
          <div className="mv-subtitle">Inventory Manager</div>
          <div className="mv-secure-pill"><FaLock /> Secure vendor access</div>
          <form className="mv-login-form" onSubmit={onLogin}>
            <label className="mv-label">Username</label>
            <input className="mv-input" value={credentials.username} onChange={(e) => setCredentials((p) => ({ ...p, username: e.target.value }))} autoComplete="username" placeholder="Enter username" />
            <label className="mv-label">Password</label>
            <input className="mv-input" type="password" value={credentials.password} onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))} autoComplete="current-password" placeholder="Enter password" />
            {error ? <div className="mv-error">{error}</div> : null}
            <button className="mv-btn mv-btn-primary" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mv-shell">
      <div className="mv-control-banner">
        <div className="mv-stat-grid">
          <div className="mv-stat-card"><div className="mv-stat-label">Total Products</div><div className="mv-stat-value">{stats.total}</div></div>
          <div className="mv-stat-card"><div className="mv-stat-label">Active</div><div className="mv-stat-value">{stats.active}</div></div>
          <div className="mv-stat-card"><div className="mv-stat-label">Veg Items</div><div className="mv-stat-value">{stats.veg}</div></div>
          <div className="mv-stat-card"><div className="mv-stat-label">Low Stock (≤5)</div><div className="mv-stat-value">{stats.lowStock}</div></div>
        </div>
        {isEmbeddedAdmin && adminBannerError ? <div className="mv-error">{adminBannerError}</div> : null}

        <div className="mv-toolbar mv-toolbar-grid">
          <div className="mv-toolbar-actions">
            <div className="mv-sort-wrap">
              <select className="mv-sort-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter products">
                {PRODUCT_TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              {isEmbeddedAdmin && typeof onOpenColumnsDialog === "function" ? (
                <button className="mv-btn small" type="button" onClick={onOpenColumnsDialog}>
                  Custom Columns
                </button>
              ) : null}
            </div>
            <div className="mv-sort-wrap">
              <FaSortAmountDown />
              <select className="mv-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name_asc">Name A-Z</option>
                <option value="no_image_first">Without Images First</option>
                <option value="with_image_first">With Images First</option>
                <option value="available_first">Available First</option>
                <option value="unavailable_first">Unavailable First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="stock_low">Stock: Low to High</option>
                <option value="stock_high">Stock: High to Low</option>
              </select>
            </div>
            <div className="mv-sort-wrap">
              <input
                className="mv-input"
                style={{ minWidth: 180 }}
                placeholder="Create category..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <button className="mv-btn small" type="button" onClick={addCategory}><FaPlus /> Category</button>
              {typeof onOpenCategoryImages === "function" ? (
                <button className="mv-btn small mv-btn-accent" type="button" onClick={onOpenCategoryImages} title="Manage category images">
                  <FaImage /> Category Images
                </button>
              ) : null}
            </div>
            {!isEmbeddedAdmin ? (
              <div className="mv-sort-wrap">
                <button className="mv-btn mv-btn-danger" onClick={onLogout} disabled={busy}><FaPowerOff /> Logout</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="mv-error">{error}</div> : null}
      {success ? <div className="mv-success"><FaCheckCircle /> {success}</div> : null}
      <datalist id="mv-product-name-options">
        {productNameOptions.map((name) => (
          <option key={name.toLowerCase()} value={name} />
        ))}
      </datalist>

      {isMobileView ? (
      <div className="mv-mobile-list">
        {!inlineAddOpen ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button className="mv-btn small" type="button" onClick={toggleSelectAllVisible} disabled={!visibleSelectionIds.length}>
              {allVisibleSelected ? "Unselect All" : "Select All"}
            </button>
            <button className="mv-btn small" type="button" onClick={clearSelectedProducts} disabled={!selectedQuantitySourceIds.length}>
              Clear ({selectedQuantitySourceIds.length})
            </button>
            <button className="mv-btn small" type="button" onClick={() => bulkSetAvailability(true)} disabled={busy || !selectedQuantitySourceIds.length}>
              Enable Selected
            </button>
            <button className="mv-btn small" type="button" onClick={() => bulkSetAvailability(false)} disabled={busy || !selectedQuantitySourceIds.length}>
              Disable Selected
            </button>
            <button className="mv-btn small mv-btn-danger" type="button" onClick={() => setDeleteTarget({ mode: "bulk", count: selectedQuantitySourceIds.length })} disabled={busy || !selectedQuantitySourceIds.length}>
              Delete Selected
            </button>
            <button className="mv-btn small mv-btn-primary mv-add-row-btn" type="button" onClick={startAdd}>
              <FaPlus /> Add Row
            </button>
            <button
              className="mv-btn small mv-btn-primary"
              type="button"
              onClick={mergeSelectedProducts}
              disabled={busy || selectedQuantitySourceIds.length < 2}
              title={selectedQuantitySourceIds.length < 2 ? "Select at least 2 products to merge quantities" : ""}
              style={{ opacity: selectedQuantitySourceIds.length < 2 ? 0.6 : 1 }}
            >
              Merge Qty ({selectedQuantitySourceIds.length})
            </button>
            <input
              className="mv-search"
              style={{ minWidth: 220, flex: "1 1 220px" }}
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        ) : null}
        {inlineAddOpen ? renderEditableCard(
          inlineAddForm,
          setInlineAddForm,
          () => saveInline(inlineAddForm, true),
          () => setInlineAddOpen(false),
          "__new_mobile__"
        ) : null}
        {pagedProducts.map((row) => {
          const id = safeText(row?.id);
          const available = row?.available !== false;
          const lowStock = parseIntSafe(row?.stock, 0) <= 5;
          return (
            <div key={id} className={`mv-mobile-card ${lowStock ? "mv-row-lowstock" : ""}`}>
              <div className="mv-product-cell">
                <input
                  type="checkbox"
                  checked={selectedQuantitySourceIds.includes(id)}
                  onChange={() => toggleQuantitySourceSelection(id)}
                  style={{ marginRight: 8 }}
                />
                {(() => {
                  const draft = ensureRowDraft(row);
                  const setDraft = makeRowDraftSetter(row);
                  const currentVeg = draft?.is_veg === true || draft?.isVeg === true;
                  const currentAvailable = draft?.available !== false;
                  const currentCustomerPrice = parseMoney(draft?.customer_price ?? draft?.customerPrice ?? draft?.selling_price ?? draft?.sellingPrice ?? draft?.price);
                  const currentMrp = parseMoney(draft?.mrp);
                  return (
                    <>
                      {resolveDisplayImageUrl(draft?.image) ? <img className="mv-thumb" src={resolveDisplayImageUrl(draft?.image)} alt={safeText(draft?.name)} /> : <div className="mv-thumb mv-thumb-empty"><FaStore /></div>}
                      <div style={{ display: "grid", gap: 8, flex: 1 }}>
                        <input className="mv-input" value={draft.name} list="mv-product-name-options" onChange={(e) => onProductNameChange(setDraft, e.target.value)} />
                        <div className="mv-product-id">{safeText(draft?.id)}</div>
                        {showColumn("description") ? <textarea className="mv-input mv-description-input" value={draft.description || ""} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} /> : null}
                        {showColumn("image_upload") ? renderImageEditor(draft, setDraft, `${id}-mobile`) : null}
                        {showColumn("category") ? (
                          <select className="mv-input" value={draft.category_id} onChange={(e) => setDraft((p) => ({ ...p, category_id: e.target.value }))}>
                            <option value="">Select category</option>
                            {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        ) : null}
                        {showColumn("type") ? (
                          <select className="mv-input" value={currentVeg ? "yes" : "no"} onChange={(e) => setDraft((p) => ({ ...p, is_veg: e.target.value === "yes" }))}>
                            <option value="yes">Veg</option>
                            <option value="no">Non Veg</option>
                          </select>
                        ) : null}
                        {showColumn("unit") ? (
                          <button className="mv-btn small mv-unit-trigger" type="button" onClick={() => openQuantityModal(row)}>
                            {quantitySummary(draft)}
                          </button>
                        ) : null}
                        {showColumn("vendor_price") ? <input className="mv-input" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))} placeholder="Vendor price" /> : null}
                        {showColumn("ev_percentage") ? <input className="mv-input" value={draft.ev_percentage} onChange={(e) => setDraft((p) => ({ ...p, ev_percentage: e.target.value }))} placeholder="EV %" /> : null}
                        {showColumn("customer_price") ? <div className="mv-mobile-row"><span className="mv-mobile-label">Customer Price</span><span>₹{currentCustomerPrice.toFixed(0)}</span></div> : null}
                        {showColumn("mrp") ? <input className="mv-input" value={draft.mrp} onChange={(e) => setDraft((p) => ({ ...p, mrp: e.target.value }))} placeholder="MRP" /> : null}
                        {showColumn("discount") ? <div className="mv-mobile-row"><span className="mv-mobile-label">Discount</span><span>{currentMrp <= 0 || currentCustomerPrice >= currentMrp ? "0%" : `${(((currentMrp - currentCustomerPrice) / currentMrp) * 100).toFixed(1)}%`}</span></div> : null}
                        {showColumn("stock") ? <input className="mv-input" value={draft.stock} onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.value }))} placeholder="Stock" /> : null}
                        {showColumn("status") ? renderAvailabilityCheckbox(row, currentAvailable, setDraft) : null}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mv-actions-cell">
                <button className="mv-btn small mv-btn-primary" onClick={() => saveExistingRow(row)} disabled={busy || autoSaving}>Save</button>
                <button className="mv-btn small mv-btn-danger" onClick={() => setDeleteTarget({ mode: "single", row, name: safeText(row?.name) || safeText(row?.id) })}>Delete</button>
              </div>
            </div>
          );
        })}
        {!filteredProducts.length && !inlineAddOpen ? <div className="mv-empty">No products found.</div> : null}
      </div>
      ) : null}

      {!isMobileView ? (
      <div className="mv-table-wrap mv-desktop-table">
        <table className="mv-table">
          <thead>
            <tr>
              {showColumn("image_upload") ? <th>Upload</th> : null}
              {showColumn("product") ? <th>Product</th> : null}
              {showColumn("description") ? <th>Description</th> : null}
              {showColumn("category") ? <th>Category</th> : null}
              {showColumn("type") ? <th>Type</th> : null}
              {showColumn("unit") ? <th>Unit</th> : null}
              {showColumn("vendor_price") ? <th>Vendor Price</th> : null}
              {showColumn("ev_percentage") ? <th>EV %</th> : null}
              {showColumn("customer_price") ? <th>Customer Price</th> : null}
              {showColumn("mrp") ? <th>MRP</th> : null}
              {showColumn("discount") ? <th>Discount</th> : null}
              {showColumn("stock") ? <th>Stock</th> : null}
              {showColumn("status") ? <th>Status</th> : null}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!inlineAddOpen ? (
              <tr className="mv-table-toolbar-row">
                <td colSpan={visibleDataColumnCount + 1}>
                  <div className="mv-table-toolbar">
                    <div className="mv-btn-group">
                      <button className="mv-btn small" type="button" onClick={toggleSelectAllVisible} disabled={!visibleSelectionIds.length}>
                        {allVisibleSelected ? "Unselect All" : "Select All"}
                      </button>
                      <button className="mv-btn small" type="button" onClick={clearSelectedProducts} disabled={!selectedQuantitySourceIds.length}>
                        Clear ({selectedQuantitySourceIds.length})
                      </button>
                    </div>
                    <div className="mv-btn-group">
                      <button className="mv-btn small" type="button" onClick={() => bulkSetAvailability(true)} disabled={busy || !selectedQuantitySourceIds.length}>
                        Enable Selected
                      </button>
                      <button className="mv-btn small" type="button" onClick={() => bulkSetAvailability(false)} disabled={busy || !selectedQuantitySourceIds.length}>
                        Disable Selected
                      </button>
                      <button className="mv-btn small mv-btn-danger" type="button" onClick={() => setDeleteTarget({ mode: "bulk", count: selectedQuantitySourceIds.length })} disabled={busy || !selectedQuantitySourceIds.length}>
                        Delete Selected
                      </button>
                    </div>
                    <div className="mv-btn-group">
                      <button className="mv-btn small mv-btn-primary mv-add-row-btn" type="button" onClick={startAdd}>
                        <FaPlus /> Add Row
                      </button>
                      <button
                        className="mv-btn small mv-btn-primary"
                        type="button"
                        onClick={mergeSelectedProducts}
                        disabled={busy || selectedQuantitySourceIds.length < 2}
                        title={selectedQuantitySourceIds.length < 2 ? "Select at least 2 products to merge quantities" : ""}
                        style={{ opacity: selectedQuantitySourceIds.length < 2 ? 0.6 : 1 }}
                      >
                        Merge Qty ({selectedQuantitySourceIds.length})
                      </button>
                    </div>
                    <div className="mv-table-toolbar-search">
                      <FaSearch className="mv-table-toolbar-search-icon" />
                      <input
                        className="mv-search"
                        placeholder="Search product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
            {inlineAddOpen ? renderEditableRow(
              inlineAddForm,
              setInlineAddForm,
              () => saveInline(inlineAddForm, true),
              () => setInlineAddOpen(false),
              "__new__"
            ) : null}

            {pagedProducts.map((row) => {
              const id = safeText(row?.id);
              const draft = ensureRowDraft(row);
              const setDraft = makeRowDraftSetter(row);
              const veg = draft?.is_veg === true || draft?.isVeg === true;
              const available = draft?.available !== false;
              const stock = parseIntSafe(draft?.stock, 0);
              const lowStock = stock <= 5;
              const customerPrice = parseMoney(draft?.customer_price ?? draft?.customerPrice ?? draft?.selling_price ?? draft?.sellingPrice ?? draft?.price);
              const mrp = parseMoney(draft?.mrp);
              return (
                <tr key={id} className={lowStock ? "mv-row-lowstock" : ""}>
                  {showColumn("image_upload") ? (
                    <td className="mv-upload-cell">
                      <div className="mv-upload-inline">
                        <input
                          type="checkbox"
                          checked={selectedQuantitySourceIds.includes(id)}
                          onChange={() => toggleQuantitySourceSelection(id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginRight: 8 }}
                        />
                        {resolveDisplayImageUrl(draft?.image) ? <img className="mv-thumb" src={resolveDisplayImageUrl(draft?.image)} alt={safeText(draft?.name)} /> : <div className="mv-thumb mv-thumb-empty"><FaStore /></div>}
                        {renderImageEditor(draft, setDraft, id)}
                      </div>
                    </td>
                  ) : null}
                  {showColumn("product") ? (
                  <td>
                    <div className="mv-product-cell mv-product-cell-compact">
                      <div style={{ minWidth: 190, flex: "1 1 auto" }}>
                        <input className="mv-input" value={draft.name} list="mv-product-name-options" onChange={(e) => onProductNameChange(setDraft, e.target.value)} />
                      </div>
                    </div>
                  </td>
                  ) : null}
                  {showColumn("description") ? <td><textarea className="mv-input mv-description-input" value={draft.description || ""} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} /></td> : null}
                  {showColumn("category") ? <td><select className="mv-input" value={draft.category_id} onChange={(e) => setDraft((p) => ({ ...p, category_id: e.target.value }))}><option value="">Select category</option>{categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></td> : null}
                  {showColumn("type") ? <td><select className="mv-input" value={veg ? "yes" : "no"} onChange={(e) => setDraft((p) => ({ ...p, is_veg: e.target.value === "yes" }))}><option value="yes">Veg</option><option value="no">Non Veg</option></select></td> : null}
                  {showColumn("unit") ? <td className="mv-unit-cell"><button className="mv-btn small mv-unit-trigger" type="button" onClick={() => openQuantityModal(row)}>{quantitySummary(draft)}</button></td> : null}
                  {showColumn("vendor_price") ? <td><input className="mv-input" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))} /></td> : null}
                  {showColumn("ev_percentage") ? <td><input className="mv-input" value={draft.ev_percentage} onChange={(e) => setDraft((p) => ({ ...p, ev_percentage: e.target.value }))} /></td> : null}
                  {showColumn("customer_price") ? <td>₹{customerPrice.toFixed(0)}</td> : null}
                  {showColumn("mrp") ? <td><input className="mv-input" value={draft.mrp} onChange={(e) => setDraft((p) => ({ ...p, mrp: e.target.value }))} /></td> : null}
                  {showColumn("discount") ? <td>{mrp <= 0 || customerPrice >= mrp ? "0%" : `${(((mrp - customerPrice) / mrp) * 100).toFixed(1)}%`}</td> : null}
                  {showColumn("stock") ? <td><input className="mv-input" value={draft.stock} onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.value }))} /></td> : null}
                  {showColumn("status") ? <td>{renderAvailabilityCheckbox(row, available, setDraft)}</td> : null}
                  <td className="mv-actions-cell">
                    <button className="mv-btn small mv-btn-primary" onClick={() => saveExistingRow(row)} disabled={busy || autoSaving}>Save</button>
                    <button className="mv-btn small mv-btn-danger" onClick={() => setDeleteTarget({ mode: "single", row, name: safeText(row?.name) || safeText(row?.id) })}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!filteredProducts.length && !inlineAddOpen ? <tr><td colSpan={visibleDataColumnCount + 1} className="mv-empty">No products found.</td></tr> : null}
          </tbody>
        </table>
      </div>
      ) : null}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
        <button className="mv-btn small" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Prev</button>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#355246" }}>Page {safePage} / {totalPages}</div>
        <input
          className="mv-input"
          style={{ width: 88, padding: "7px 10px" }}
          value={pageDraft}
          onChange={(e) => setPageDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const nextPage = Math.min(totalPages, Math.max(1, Number(pageDraft || safePage)));
              setPage(nextPage);
            }
          }}
          placeholder="Page #"
        />
        <button className="mv-btn small" type="button" onClick={() => setPage(Math.min(totalPages, Math.max(1, Number(pageDraft || safePage))))}>Go</button>
        <button className="mv-btn small" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next</button>
      </div>
      {quantityModalRowId ? (() => {
        const modalRow = (Array.isArray(products) ? products.find((row) => safeText(row?.id) === safeText(quantityModalRowId)) : null) || null;
        const modalDraft = modalRow ? ensureRowDraft(modalRow) : null;
        const modalSetter = modalRow ? makeRowDraftSetter(modalRow) : null;
        if (!modalRow || !modalDraft || !modalSetter) return null;
        return (
        <div className="mv-modal-backdrop" onClick={() => setQuantityModalRowId("")}>
          <div className="mv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-head">
              <div>Edit Unit Options</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="mv-btn small mv-btn-primary" type="button" onClick={() => saveExistingRow(modalRow)} disabled={busy || autoSaving}>Save</button>
                <button className="mv-btn small" type="button" onClick={() => setQuantityModalRowId("")}>Close</button>
              </div>
            </div>
            <div className="small" style={{ color: "#4d6156", marginBottom: 10 }}>
              Update quantity options here, then click Save.
              {autoSaving ? " Saving..." : ""}
            </div>
            {renderQuantityEditor(modalDraft, modalSetter)}
          </div>
        </div>
      ); })() : null}
      {deleteTarget ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setDeleteTarget(null))}>
          <div className="modal card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">{deleteTarget.mode === "bulk" ? "Delete selected products" : "Delete product"}</h3>
            <div className="small">
              {deleteTarget.mode === "bulk"
                ? `Delete ${deleteTarget.count} selected product${deleteTarget.count === 1 ? "" : "s"}? They stop appearing in the app straight away.`
                : `Delete "${deleteTarget.name}"? It stops appearing in the app straight away.`}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                className="mv-btn mv-btn-danger"
                type="button"
                disabled={busy}
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target.mode === "bulk") await bulkDeleteSelectedProducts();
                  else await deleteProduct(target.row);
                }}
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
              <button className="mv-btn" type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

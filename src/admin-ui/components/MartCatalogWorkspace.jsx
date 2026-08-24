import React, { useEffect, useMemo, useState } from "react";
import { FaLeaf, FaPlus, FaSearch, FaSortAmountDown, FaStore, FaSyncAlt, FaUtensils } from "react-icons/fa";
import AIFormJsonAssistant from "./AIFormJsonAssistant";
import PricingControlsWorkspace from "./PricingControlsWorkspace";

const MART_CATEGORY_ICON_OPTIONS = [
  "FiGrid",
  "FiShoppingBag",
  "FiCoffee",
  "FiGift",
  "FiDroplet",
  "FiFeather",
  "FiSun",
  "FiHome",
  "FiTag",
  "FiBox",
  "FaAppleAlt",
  "FaLeaf",
  "FaWineBottle",
  "FaBreadSlice",
  "FaCheese",
  "FaFish",
  "FaDrumstickBite",
  "FaPumpSoap",
  "FaCookieBite",
  "FaCandyCane"
];

const INVENTORY_COLUMN_OPTIONS = [
  { key: "image_upload", label: "Image" },
  { key: "product", label: "Product" },
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
const DEFAULT_VISIBLE_INVENTORY_COLUMNS = INVENTORY_COLUMN_OPTIONS.map((x) => x.key);

function normalizeInventoryVisibleColumns(value) {
  const parsed = parseInventoryVisibleColumns(value).filter((key) =>
    INVENTORY_COLUMN_OPTIONS.some((option) => option.key === key)
  );
  const selected = parsed.length ? parsed : DEFAULT_VISIBLE_INVENTORY_COLUMNS;
  return Array.from(new Set(["image_upload", ...selected]));
}
const PRODUCT_TYPE_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "veg", label: "Veg" },
  { key: "nonveg", label: "Non Veg" },
  { key: "lowstock", label: "Low Stock" },
  { key: "inactive", label: "Inactive" }
];

function parseInventoryVisibleColumns(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((x) => String(x || "").trim()).filter(Boolean)));
  }
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((x) => String(x || "").trim()).filter(Boolean)));
      }
    } catch {
      // Fall through to CSV parsing.
    }
  }
  return Array.from(new Set(raw.split(",").map((x) => x.trim()).filter(Boolean)));
}

function sanitizeCategoryIconName(value, fallback = "FiGrid") {
  const icon = String(value || "").trim();
  if (!icon) return fallback;
  if (!/^(Fi|Fa)[A-Z][A-Za-z0-9]*$/.test(icon)) return fallback;
  return icon;
}

function parseCategoryIconFromTags(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  for (const entry of list) {
    const m = String(entry || "").match(/^caticon:(Fi|Fa)[A-Z][A-Za-z0-9]*$/);
    if (m) return String(entry).slice("caticon:".length);
  }
  return "";
}

function parseCategoryImageFromTags(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  for (const entry of list) {
    const m = String(entry || "").match(/^catimage:(.+)$/);
    if (m) return String(entry).slice("catimage:".length);
  }
  return "";
}

function withCategoryIconInTags(value, iconName) {
  const list = Array.isArray(value)
    ? value.map((x) => String(x || "").trim()).filter(Boolean)
    : String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  const noIconToken = list.filter((x) => !/^caticon:(Fi|Fa)[A-Z][A-Za-z0-9]*$/.test(x));
  const icon = sanitizeCategoryIconName(iconName || "", "");
  if (icon) noIconToken.push(`caticon:${icon}`);
  return noIconToken;
}

function withCategoryImageInTags(value, imageUrl) {
  const list = Array.isArray(value)
    ? value.map((x) => String(x || "").trim()).filter(Boolean)
    : String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  const noImageToken = list.filter((x) => !/^catimage:.+$/.test(x));
  const image = String(imageUrl || "").trim();
  if (image) noImageToken.push(`catimage:${image}`);
  return noImageToken;
}

export default function MartCatalogWorkspace({ snapshot, onReload, onUpsert, onDelete, TABLES, PAGE_SIZE, Pagination, safeText, safeJsonParse, viewMode = "catalog" }) {
  const credentialOnly = viewMode === "credentials";
  const marts = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.MARTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);

  const products = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.PRODUCTS);
    return Array.isArray(t?.rows) ? t.rows : [];
  }, [snapshot]);
  const martColumns = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.MARTS);
    return Array.isArray(t?.columns) ? t.columns.map((c) => String(c?.name || "")).filter(Boolean) : [];
  }, [snapshot, TABLES.MARTS]);
  const productColumns = useMemo(() => {
    const t = (snapshot?.tables || []).find((x) => x.name === TABLES.PRODUCTS);
    return Array.isArray(t?.columns) ? t.columns.map((c) => String(c?.name || "")).filter(Boolean) : [];
  }, [snapshot, TABLES.PRODUCTS]);
  const martUsernameColumn = useMemo(
    () => (martColumns.includes("username") ? "username" : ""),
    [martColumns]
  );
  const martPasswordColumn = useMemo(
    () => (martColumns.includes("password") ? "password" : ""),
    [martColumns]
  );
  const inventoryColumnsField = useMemo(() => {
    const candidates = [
      "inventory_visible_columns",
      "inventory_columns",
      "visible_columns",
      "vendor_columns"
    ];
    return candidates.find((c) => martColumns.includes(c)) || "";
  }, [martColumns]);

  const [martQuery, setMartQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [martId, setMartId] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [martMode, setMartMode] = useState("none"); // none | edit | new
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [martDraft, setMartDraft] = useState({
    id: "",
    name: "",
    location: "",
    phone: "",
    category: "",
    description: "",
    inventoryUsername: "",
    inventoryPassword: "",
    inventoryVisibleColumns: DEFAULT_VISIBLE_INVENTORY_COLUMNS,
    available: true
  });
  const [productDraft, setProductDraft] = useState({
    id: "",
    name: "",
    categoryId: "",
    subCategory: "",
    unit: "",
    description: "",
    offer: "",
    price: "",
    mrp: "",
    stock: "",
    maxPerOrder: "",
    isVeg: false,
    brand: "",
    tags: "",
    deliveryPincodes: "",
    type: "",
    rating: "",
    categoryIcon: "FiGrid",
    image: "",
    available: true
  });
  const [productEdits, setProductEdits] = useState({});
  const [newProductRow, setNewProductRow] = useState({
    id: "",
    name: "",
    categoryId: "",
    subCategory: "",
    unit: "",
    description: "",
    offer: "",
    price: "",
    mrp: "",
    stock: "",
    maxPerOrder: "",
    isVeg: false,
    brand: "",
    tags: "",
    deliveryPincodes: "",
    type: "",
    rating: "",
    categoryIcon: "FiGrid",
    image: "",
    available: true
  });
  const [productsJson, setProductsJson] = useState("[]");

  const normalizeId = (v) => safeText(v).trim();
  const productMartId = (x) => normalizeId(x?.mart_partner_id || x?.martPartnerId || x?.mart_id || x?.martId || "");

  useEffect(() => {
    if (!martId && marts[0]?.id) setMartId(String(marts[0].id));
  }, [marts, martId]);

  const filteredMarts = useMemo(() => {
    const q = martQuery.trim().toLowerCase();
    if (!q) return marts;
    return marts.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  }, [marts, martQuery]);

  const selectedMart = useMemo(
    () => marts.find((m) => String(m?.id || "") === String(martId || "")) || null,
    [marts, martId]
  );

  const activeMartProducts = useMemo(() => {
    const activeMartId = normalizeId(martId || "");
    return products.filter((p) => productMartId(p) === activeMartId);
  }, [products, martId]);

  const martProducts = useMemo(() => {
    const list = activeMartProducts.slice();
    const q = productQuery.trim().toLowerCase();
    let filtered = q ? list.filter((p) => JSON.stringify(p).toLowerCase().includes(q)) : list;
    if (typeFilter === "veg") filtered = filtered.filter((p) => p?.is_veg === true || p?.isVeg === true);
    if (typeFilter === "nonveg") filtered = filtered.filter((p) => !(p?.is_veg === true || p?.isVeg === true));
    if (typeFilter === "inactive") filtered = filtered.filter((p) => p?.available === false);
    if (typeFilter === "lowstock") filtered = filtered.filter((p) => Number(p?.stock || 0) <= 5);
    filtered.sort((a, b) => {
      const aName = String(a?.name || "");
      const bName = String(b?.name || "");
      const aPrice = Number(a?.price || 0);
      const bPrice = Number(b?.price || 0);
      const aStock = Number(a?.stock || 0);
      const bStock = Number(b?.stock || 0);
      const aAvailable = a?.available !== false;
      const bAvailable = b?.available !== false;
      if (sortBy === "available_first" && aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      if (sortBy === "unavailable_first" && aAvailable !== bAvailable) return aAvailable ? 1 : -1;
      if (sortBy === "price_low") return aPrice - bPrice;
      if (sortBy === "price_high") return bPrice - aPrice;
      if (sortBy === "stock_low") return aStock - bStock;
      if (sortBy === "stock_high") return bStock - aStock;
      return aName.localeCompare(bName);
    });
    return filtered;
  }, [activeMartProducts, productQuery, typeFilter, sortBy]);
  const [productPage, setProductPage] = useState(1);
  // Deletion confirmations live in the page, not in window.confirm/prompt.
  // Native dialogs are suppressed outright once a browser decides a page is
  // spamming them (and in embedded webviews), and a suppressed confirm()
  // returns false - so the Delete button did nothing at all, with no error
  // to explain why. The typed "DELETE"/"DELETE_MART" prompt was worse: it
  // is case- and whitespace-sensitive, so a near-miss cancelled the delete.
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  useEffect(() => {
    setProductPage(1);
  }, [productQuery, martId]);

  useEffect(() => {
    setProductPage(1);
  }, [typeFilter, sortBy]);

  useEffect(() => {
    if (!selectedMart) return;
    if (martMode !== "edit") return;
    setMartDraft({
      id: safeText(selectedMart?.id || ""),
      name: safeText(selectedMart?.name || ""),
      location: safeText(selectedMart?.location || ""),
      phone: safeText(selectedMart?.phone || selectedMart?.phone_number || ""),
      category: safeText(selectedMart?.category || ""),
      description: safeText(selectedMart?.description || ""),
      inventoryUsername: martUsernameColumn ? safeText(selectedMart?.[martUsernameColumn] || "") : "",
      inventoryPassword: martPasswordColumn ? safeText(selectedMart?.[martPasswordColumn] || "") : "",
      inventoryVisibleColumns: inventoryColumnsField
        ? normalizeInventoryVisibleColumns(selectedMart?.[inventoryColumnsField])
        : DEFAULT_VISIBLE_INVENTORY_COLUMNS,
      available: selectedMart?.available !== false
    });
    setProductsJson(JSON.stringify(martProducts, null, 2));
  }, [selectedMart?.id, martProducts.length, martMode, martUsernameColumn, martPasswordColumn, inventoryColumnsField]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    customCategories.forEach((v) => {
      const value = safeText(v);
      if (value) set.add(value);
    });
    products.forEach((p) => {
      const v = safeText(p?.category_id || p?.categoryId || "");
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [products, customCategories]);
  const productNameOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const v = safeText(p?.name || "");
      if (v) set.add(v);
    });
    return Array.from(set);
  }, [products]);
  const hasCategoryIconColumn = useMemo(
    () => productColumns.includes("category_icon") || productColumns.includes("categoryIcon"),
    [productColumns]
  );
  const hasCategoryImageColumn = useMemo(
    () => productColumns.includes("category_image") || productColumns.includes("categoryImage"),
    [productColumns]
  );

  const productStats = useMemo(() => {
    const list = activeMartProducts;
    return {
      total: list.length,
      active: list.filter((x) => x?.available !== false).length,
      veg: list.filter((x) => x?.is_veg === true || x?.isVeg === true).length,
      lowStock: list.filter((x) => Number(x?.stock || 0) <= 5).length
    };
  }, [activeMartProducts]);

  const buildProductUpsertPayload = (row, override = {}) => {
    const categoryIcon = sanitizeCategoryIconName(
      override.categoryIcon ?? row?.categoryIcon ?? row?.category_icon ?? "FiGrid",
      "FiGrid"
    );
    const categoryImage = safeText(
      override.categoryImage ??
      override.category_image ??
      row?.categoryImage ??
      row?.category_image ??
      parseCategoryImageFromTags(override.tags ?? row?.tags)
    ).trim();
    let tags = withCategoryIconInTags(override.tags ?? row?.tags, categoryIcon);
    tags = withCategoryImageInTags(tags, categoryImage);
    return {
      id: safeText(override.id ?? row?.id),
      mart_partner_id: martId,
      name: safeText((override.name ?? row?.name) || ""),
      category_id: safeText((override.categoryId ?? row?.categoryId ?? row?.category_id) || "") || "uncategorized",
      sub_category: safeText((override.subCategory ?? row?.subCategory ?? row?.sub_category) || ""),
      unit: safeText((override.unit ?? row?.unit) || ""),
      description: safeText((override.description ?? row?.description) || ""),
      offer: safeText((override.offer ?? row?.offer) || ""),
      price: Number((override.price ?? row?.price) || 0),
      mrp: Number((override.mrp ?? row?.mrp) || 0),
      stock: Number((override.stock ?? row?.stock) || 0),
      max_per_order: Number((override.maxPerOrder ?? row?.maxPerOrder ?? row?.max_per_order) || 0) || 0,
      is_veg: (override.isVeg ?? row?.isVeg) === true || (override.is_veg ?? row?.is_veg) === true,
      tags,
      brand: safeText((override.brand ?? row?.brand) || ""),
      delivery_pincodes: safeText((override.deliveryPincodes ?? row?.deliveryPincodes ?? row?.delivery_pincodes) || ""),
      type: safeText((override.type ?? row?.type) || ""),
      rating: Number((override.rating ?? row?.rating) || 0) || 0,
      ...(hasCategoryIconColumn ? { category_icon: categoryIcon } : {}),
      ...(hasCategoryImageColumn ? { category_image: categoryImage } : {}),
      image: safeText((override.image ?? row?.image ?? row?.hero_image) || "").trim() || "https://placehold.co/600x400?text=Image",
      available: (override.available ?? row?.available) !== false
    };
  };

  const resetProductDraft = () => {
    setProductDraft({
      id: "",
      name: "",
      categoryId: "",
      subCategory: "",
      unit: "",
      description: "",
      offer: "",
      price: "",
      mrp: "",
      stock: "",
      maxPerOrder: "",
      isVeg: false,
      brand: "",
      tags: "",
      deliveryPincodes: "",
      type: "",
      rating: "",
      categoryIcon: "FiGrid",
      image: "",
      available: true
    });
  };

  const editProduct = (item) => {
    setProductDraft({
      id: safeText(item?.id || ""),
      name: safeText(item?.name || ""),
      martPartnerId: safeText(item?.mart_partner_id || item?.martPartnerId || ""),
      categoryId: safeText(item?.category_id || item?.categoryId || ""),
      subCategory: safeText(item?.sub_category || item?.subCategory || ""),
      unit: safeText(item?.unit || ""),
      description: safeText(item?.description || ""),
      offer: safeText(item?.offer || ""),
      price: safeText(item?.price ?? ""),
      mrp: safeText(item?.mrp ?? ""),
      stock: safeText(item?.stock ?? ""),
      maxPerOrder: safeText(item?.max_per_order ?? item?.maxPerOrder ?? ""),
      isVeg: item?.is_veg === true || item?.isVeg === true,
      brand: safeText(item?.brand || ""),
      tags: Array.isArray(item?.tags) ? item.tags.join(", ") : safeText(item?.tags || ""),
      deliveryPincodes: safeText(item?.delivery_pincodes || ""),
      type: safeText(item?.type || ""),
      rating: safeText(item?.rating ?? ""),
      categoryIcon: sanitizeCategoryIconName(item?.category_icon || item?.categoryIcon || parseCategoryIconFromTags(item?.tags), "FiGrid"),
      image: safeText(item?.image || item?.hero_image || ""),
      available: item?.available !== false
    });
  };

  const startNewProductRow = () => {
    setNewProductRow({
      id: "",
      name: "",
      categoryId: "",
      subCategory: "",
      unit: "",
      description: "",
      offer: "",
      price: "",
      mrp: "",
      stock: "",
      maxPerOrder: "",
      isVeg: false,
      brand: "",
      tags: "",
      deliveryPincodes: "",
      type: "",
      rating: "",
      categoryIcon: "FiGrid",
      image: "",
      available: true
    });
  };

  const updateProductEdit = (id, key, value) => {
    setProductEdits((prev) => {
      const base = prev[id] || martProducts.find((p) => String(p.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveMart = async () => {
    if (!martDraft.name.trim()) { setError("Mart name is required"); return; }
    if ((safeText(martDraft.inventoryUsername) || safeText(martDraft.inventoryPassword)) && (!safeText(martDraft.inventoryUsername) || !safeText(martDraft.inventoryPassword))) {
      setError("Inventory username and password must both be provided.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = martDraft.id || `mart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const row = {
        id,
        name: martDraft.name,
        location: martDraft.location || "",
        phone: martDraft.phone || "",
        category: martDraft.category || "",
        description: martDraft.description || "",
        available: !!martDraft.available
      };
      if (martUsernameColumn) row[martUsernameColumn] = safeText(martDraft.inventoryUsername).toLowerCase();
      if (martPasswordColumn) row[martPasswordColumn] = safeText(martDraft.inventoryPassword);
      if (inventoryColumnsField) {
        row[inventoryColumnsField] = normalizeInventoryVisibleColumns(martDraft.inventoryVisibleColumns);
      }
      await onUpsert(TABLES.MARTS, [row]);
      await onReload();
      setMartId(id);
      setMartMode("edit");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!martId) { setError("Select a mart first."); return; }
    if (!productDraft.name.trim()) { setError("Product name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = productDraft.id || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const image = safeText(productDraft.image || "").trim() || "https://placehold.co/600x400?text=Image";
      const categoryIcon = sanitizeCategoryIconName(productDraft.categoryIcon || "FiGrid", "FiGrid");
      const categoryImage = safeText(productDraft.categoryImage || productDraft.category_image || "").trim();
      let tags = withCategoryIconInTags(productDraft.tags, categoryIcon);
      tags = withCategoryImageInTags(tags, categoryImage);
      await onUpsert(TABLES.PRODUCTS, [{
        id,
        mart_partner_id: martId,
        name: productDraft.name,
        category_id: safeText(productDraft.categoryId || "") || "uncategorized",
        sub_category: productDraft.subCategory || "",
        unit: productDraft.unit || "",
        description: productDraft.description || "",
        offer: productDraft.offer || "",
        price: Number(productDraft.price || 0),
        mrp: Number(productDraft.mrp || 0),
        stock: Number(productDraft.stock || 0),
        max_per_order: Number(productDraft.maxPerOrder || 0) || 0,
        is_veg: !!productDraft.isVeg,
        tags,
        brand: productDraft.brand || "",
        delivery_pincodes: productDraft.deliveryPincodes || "",
        type: productDraft.type || "",
        rating: Number(productDraft.rating || 0) || 0,
        ...(hasCategoryIconColumn ? { category_icon: categoryIcon } : {}),
        ...(hasCategoryImageColumn ? { category_image: categoryImage } : {}),
        image,
        available: !!productDraft.available
      }]);
      await onReload();
      setProductDraft((p) => ({ ...p, id }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveProductRow = async (row) => {
    if (!martId) { setError("Select a mart first."); return; }
    if (!safeText(row?.name).trim()) { setError("Product name is required"); return; }
    setBusy(true);
    setError("");
    try {
      const id = safeText(row?.id) || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const payload = buildProductUpsertPayload(row, { id });
      await onUpsert(TABLES.PRODUCTS, [payload]);
      await onReload();
      setProductEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      startNewProductRow();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!safeText(id)) { setError("This product has no id, so it cannot be deleted."); return; }
    setBusy(true);
    setError("");
    try {
      await onDelete(TABLES.PRODUCTS, id, "id", "DELETE");
      await onReload();
      resetProductDraft();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteMart = async () => {
    if (!martId) return;
    const ok = window.confirm("Delete this mart and all of its products?");
    if (!ok) return;
    const typed = window.prompt("Type DELETE_MART to confirm mart deletion", "");
    if (safeText(typed) !== "DELETE_MART") { setError("Delete cancelled: confirmation text did not match."); return; }
    setBusy(true);
    setError("");
    try {
      const rows = products.filter((p) => productMartId(p) === String(martId));
      for (const p of rows) {
        const id = safeText(p?.id || "");
        if (!id) continue;
        await onDelete(TABLES.PRODUCTS, id, "id", "DELETE");
      }
      await onDelete(TABLES.MARTS, martId, "id", "DELETE");
      await onReload();
      setMartId("");
      resetProductDraft();
      setMartMode("none");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const addCategory = () => {
    const category = safeText(newCategoryName || "");
    if (!category) return;
    setCustomCategories((prev) => (prev.includes(category) ? prev : [...prev, category]));
    if (!safeText(newProductRow.categoryId || "")) {
      setNewProductRow((prev) => ({ ...prev, categoryId: category }));
    }
    setNewCategoryName("");
  };

  const saveProductsJson = async () => {
    if (!martId) { setError("Select a mart first."); return; }
    setBusy(true);
    setError("");
    try {
      const parsed = JSON.parse(productsJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
      const normalized = parsed.map((x) => {
        const categoryIcon = sanitizeCategoryIconName(x?.category_icon || x?.categoryIcon || parseCategoryIconFromTags(x?.tags), "FiGrid");
        const categoryImage = safeText(x?.category_image || x?.categoryImage || parseCategoryImageFromTags(x?.tags)).trim();
        let tags = withCategoryIconInTags(x?.tags, categoryIcon);
        tags = withCategoryImageInTags(tags, categoryImage);
        return {
          id: safeText(x?.id || ""),
          mart_partner_id: martId,
          name: safeText(x?.name || ""),
          category_id: safeText(x?.category_id || x?.categoryId || "") || "uncategorized",
          sub_category: safeText(x?.sub_category || x?.subCategory || ""),
          unit: safeText(x?.unit || ""),
          description: safeText(x?.description || ""),
          price: Number(x?.price || 0),
          mrp: Number(x?.mrp || 0),
          stock: Number(x?.stock || 0),
          max_per_order: Number(x?.max_per_order || x?.maxPerOrder || 0) || 0,
          is_veg: x?.is_veg === true || x?.isVeg === true,
          tags,
          brand: safeText(x?.brand || ""),
          delivery_pincodes: safeText(x?.delivery_pincodes || x?.deliveryPincodes || ""),
          type: safeText(x?.type || ""),
          rating: Number(x?.rating || 0) || 0,
          ...(hasCategoryIconColumn ? { category_icon: categoryIcon } : {}),
          ...(hasCategoryImageColumn ? { category_image: categoryImage } : {}),
          image: safeText(x?.image ?? x?.hero_image ?? "") || "https://placehold.co/600x400?text=Image",
          available: x?.available !== false
        };
      }).filter((x) => x.id && x.name);
      if (!normalized.length) throw new Error("At least 1 item with {id,name} is required");
      await onUpsert(TABLES.PRODUCTS, normalized);
      await onReload();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const toggleInventoryColumn = (key) => {
    setMartDraft((prev) => {
      const current = Array.isArray(prev.inventoryVisibleColumns) ? prev.inventoryVisibleColumns : [];
      const has = current.includes(key);
      const next = has ? current.filter((x) => x !== key) : [...current, key];
      return { ...prev, inventoryVisibleColumns: next };
    });
  };

  const openMartEditor = (m) => {
    setMartId(String(m?.id || ""));
    setMartMode("edit");
    resetProductDraft();
    setMartDraft({
      id: safeText(m?.id || ""),
      name: safeText(m?.name || ""),
      location: safeText(m?.location || ""),
      phone: safeText(m?.phone || m?.phone_number || ""),
      category: safeText(m?.category || ""),
      description: safeText(m?.description || ""),
      inventoryUsername: martUsernameColumn ? safeText(m?.[martUsernameColumn] || "") : "",
      inventoryPassword: martPasswordColumn ? safeText(m?.[martPasswordColumn] || "") : "",
      inventoryVisibleColumns: inventoryColumnsField
        ? normalizeInventoryVisibleColumns(m?.[inventoryColumnsField])
        : DEFAULT_VISIBLE_INVENTORY_COLUMNS,
      available: m?.available !== false
    });
  };

  return (
    <div className={`workspace ${credentialOnly ? "" : "workspace-single"}`}>
      {credentialOnly ? (
        <div className="pane">
          <div className="pane-title">
            <div>Vendors</div>
          </div>
          <input className="input" value={martQuery} onChange={(e) => setMartQuery(e.target.value)} placeholder="Search vendors..." />
          <div className="list mt-10">
            {filteredMarts.map((m) => (
              <div
                key={safeText(m?.id || "")}
                className={`vendor-card ${String(m?.id || "") === String(martId || "") ? "active" : ""}`}
                onClick={() => openMartEditor(m)}
                role="button"
                tabIndex={0}
              >
                <div className="vendor-name">{safeText(m?.name || m?.id || "")}</div>
                <div className="vendor-sub">{safeText(m?.location || "").slice(0, 40)}</div>
                <div className="vendor-actions">
                  <button
                    className="btn small"
                    onClick={() => openMartEditor(m)}
                    disabled={busy}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`pane ${credentialOnly ? "" : "pane-plain"}`}>
        {credentialOnly ? (
          <div className="pane-title">
            <div>Vendor Credential Settings</div>
          </div>
        ) : null}

        {credentialOnly && error ? <div className="warn">{error}</div> : null}

        {credentialOnly ? (
          martMode === "none" ? (
            <div className="small">Select a vendor from left list to manage inventory login and table columns.</div>
          ) : (
            <div className="card m-0">
              <div className="small mb-8">Credential Manager</div>
              <div className="small mb-8">
                <strong>{safeText(martDraft.name || martDraft.id)}</strong>
                {safeText(martDraft.location) ? ` - ${safeText(martDraft.location)}` : ""}
              </div>
              <div className="field full mt-10">
                <label>Vendor Inventory Credentials</label>
                {martUsernameColumn && martPasswordColumn ? (
                  <div className="split-row">
                    <div className="field">
                      <label>Inventory Username</label>
                      <input
                        className="input"
                        value={martDraft.inventoryUsername}
                        onChange={(e) => setMartDraft((p) => ({ ...p, inventoryUsername: e.target.value }))}
                        placeholder="vendor_username"
                      />
                    </div>
                    <div className="field">
                      <label>Inventory Password</label>
                      <input
                        className="input"
                        type="password"
                        value={martDraft.inventoryPassword}
                        onChange={(e) => setMartDraft((p) => ({ ...p, inventoryPassword: e.target.value }))}
                        placeholder="Set vendor password"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="small">`username`/`password` columns are not present in mart partner table.</div>
                )}
              </div>
              <div className="field full mt-10">
                <label>Vendor Inventory Visible Columns</label>
                {inventoryColumnsField ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                    {INVENTORY_COLUMN_OPTIONS.map((opt) => (
                      <label key={opt.key} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={(martDraft.inventoryVisibleColumns || []).includes(opt.key)}
                          onChange={() => toggleInventoryColumn(opt.key)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="small">Add `inventory_visible_columns` (jsonb/text) column in `ev_mart_partners` to configure this.</div>
                )}
              </div>
              <div className="mt-10 flex-gap10-wrap">
                <button className="btn primary" onClick={saveMart} disabled={busy}>Save Credential Settings</button>
              </div>
            </div>
          )
        ) : !selectedMart ? (
          <div className="mv-shell mv-admin-shell">
            <div className="mv-admin-strip">
              <div>
                <div className="mv-admin-title">ExploreValley Vendor Portal</div>
                <div className="mv-admin-sub">Pick a vendor to manage catalog data, stock, and pricing from one place.</div>
              </div>
              <div className="mv-admin-actions">
                <select
                  className="mv-input mv-admin-select"
                  value={martId}
                  onChange={(e) => setMartId(e.target.value)}
                >
                  <option value="">Select vendor...</option>
                  {filteredMarts.map((m) => (
                    <option key={safeText(m?.id || "")} value={safeText(m?.id || "")}>
                      {safeText(m?.name || m?.id || "")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error ? <div className="mv-error">{error}</div> : null}
            <div className="mv-empty-state">
              <div className="mv-empty-title">No vendor selected</div>
              <div className="mv-empty-copy">Choose a vendor from the dropdown above to open the inventory workspace.</div>
            </div>
          </div>
        ) : (
          <div className="mv-shell mv-admin-shell">
            <div className="mv-admin-strip">
              <div>
                <div className="mv-admin-title">ExploreValley Vendor Portal</div>
                <div className="mv-admin-sub">Manage product catalog, stock health, and category structure for the selected vendor.</div>
              </div>
              <div className="mv-admin-actions">
                <select
                  className="mv-input mv-admin-select"
                  value={martId}
                  onChange={(e) => setMartId(e.target.value)}
                >
                  <option value="">Select vendor...</option>
                  {filteredMarts.map((m) => (
                    <option key={safeText(m?.id || "")} value={safeText(m?.id || "")}>
                      {safeText(m?.name || m?.id || "")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <div className="mv-error">{error}</div> : null}

            <div className="mv-hero">
              <div className="mv-hero-eyebrow">Vendor Profile</div>
              <div className="mv-hero-title">{safeText(selectedMart?.name || selectedMart?.id || "Vendor")}</div>
              <div className="mv-hero-sub">Curate quality, control stock, and publish changes instantly.</div>
              <div className="mv-hero-meta">
                {safeText(selectedMart?.location) ? (
                  <span className="mv-hero-chip"><FaStore /> {safeText(selectedMart?.location)}</span>
                ) : null}
                <span className="mv-hero-chip">ID: <code>{safeText(selectedMart?.id || "—")}</code></span>
                <span className="mv-hero-chip">{productStats.total} products</span>
              </div>
            </div>

            <div className="mv-topbar">
              <div className="mv-topbar-copy">
                <div className="mv-title">Vendor Inventory</div>
                <div className="mv-subtitle">{safeText(selectedMart?.name || selectedMart?.id || "Vendor")} • ID: {safeText(selectedMart?.id || "—")}</div>
              </div>
              <div className="mv-top-actions" />
            </div>

            <div className="mv-stat-grid">
              <div className="mv-stat-card"><div className="mv-stat-label">Total Products</div><div className="mv-stat-value">{productStats.total}</div></div>
              <div className="mv-stat-card"><div className="mv-stat-label">Active</div><div className="mv-stat-value">{productStats.active}</div></div>
              <div className="mv-stat-card"><div className="mv-stat-label">Veg Items</div><div className="mv-stat-value">{productStats.veg}</div></div>
              <div className="mv-stat-card"><div className="mv-stat-label">Low Stock (≤5)</div><div className="mv-stat-value">{productStats.lowStock}</div></div>
            </div>

            <div className="mv-toolbar mv-toolbar-grid">
              <div className="mv-search-wrap">
                <FaSearch />
                <input className="mv-search" placeholder="Search products..." value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
              </div>
              <div className="mv-toolbar-actions">
                <div className="mv-sort-wrap">
                  <select className="mv-sort-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter products">
                    {PRODUCT_TYPE_FILTER_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mv-sort-wrap">
                  <FaSortAmountDown />
                  <select className="mv-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name_asc">Name A-Z</option>
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
                </div>
              </div>
            </div>

            <datalist id="mart-category-options">
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
            <datalist id="mart-product-name-options">
              {productNameOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            <div className="mv-table-wrap mv-desktop-table">
              <table className="mv-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Unit</th>
                    <th>Vendor Price</th>
                    <th>EV %</th>
                    <th>Customer Price</th>
                    <th>MRP</th>
                    <th>Discount</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><input className="input" value={newProductRow.name} onChange={(e) => setNewProductRow((p) => ({ ...p, name: e.target.value }))} placeholder="Product name" list="mart-product-name-options" /></td>
                    <td><input className="input" value={newProductRow.categoryId} onChange={(e) => setNewProductRow((p) => ({ ...p, categoryId: e.target.value }))} placeholder="Category" list="mart-category-options" /></td>
                    <td>
                      <select className="input" value={newProductRow.isVeg ? "veg" : "nonveg"} onChange={(e) => setNewProductRow((p) => ({ ...p, isVeg: e.target.value === "veg" }))}>
                        <option value="veg">Veg</option>
                        <option value="nonveg">Non Veg</option>
                      </select>
                    </td>
                    <td><input className="input" value={newProductRow.unit} onChange={(e) => setNewProductRow((p) => ({ ...p, unit: e.target.value }))} placeholder="1L / 500g" /></td>
                    <td><input className="input" value={newProductRow.price} onChange={(e) => setNewProductRow((p) => ({ ...p, price: e.target.value }))} placeholder="0" /></td>
                    <td><input className="input" value={"0"} readOnly /></td>
                    <td><input className="input" value={newProductRow.price} readOnly /></td>
                    <td><input className="input" value={newProductRow.mrp} onChange={(e) => setNewProductRow((p) => ({ ...p, mrp: e.target.value }))} placeholder="0" /></td>
                    <td>{(() => {
                      const mrp = Number(newProductRow.mrp || 0);
                      const price = Number(newProductRow.price || 0);
                      if (mrp <= 0 || price >= mrp) return "0%";
                      return `${(((mrp - price) / mrp) * 100).toFixed(1)}%`;
                    })()}</td>
                    <td><input className="input" value={newProductRow.stock} onChange={(e) => setNewProductRow((p) => ({ ...p, stock: e.target.value }))} placeholder="0" /></td>
                    <td>
                      <select className="input" value={newProductRow.available !== false ? "active" : "inactive"} onChange={(e) => setNewProductRow((p) => ({ ...p, available: e.target.value === "active" }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="mv-actions-cell">
                      <button className="mv-btn small mv-btn-primary" onClick={() => saveProductRow({ ...newProductRow, id: newProductRow.id || `prod_${Date.now()}_${Math.random().toString(16).slice(2)}` })} type="button" disabled={busy || !martId}>Save</button>
                    </td>
                  </tr>
                  {martProducts.slice((productPage - 1) * PAGE_SIZE, productPage * PAGE_SIZE).map((p) => {
                    const edit = productEdits[p.id] || p;
                    const veg = edit?.is_veg === true || edit?.isVeg === true;
                    const available = edit?.available !== false;
                    const stock = Number(edit?.stock || 0);
                    const lowStock = stock <= 5;
                    const price = Number(edit?.price || 0);
                    const mrp = Number(edit?.mrp || 0);
                    return (
                      <tr key={safeText(p?.id || "")} className={lowStock ? "mv-row-lowstock" : ""}>
                        <td>
                          <div className="mv-product-cell">
                            {safeText(edit?.image || "") ? <img className="mv-thumb" src={safeText(edit?.image || "")} alt={safeText(edit?.name || "")} /> : <div className="mv-thumb mv-thumb-empty"><FaStore /></div>}
                            <div>
                              <input className="input" value={safeText(edit.name)} onChange={(e) => updateProductEdit(p.id, "name", e.target.value)} list="mart-product-name-options" />
                              <div className="mv-product-id">{safeText(edit?.id || "")}</div>
                            </div>
                          </div>
                        </td>
                        <td><input className="input" value={safeText(edit.category_id || edit.categoryId)} onChange={(e) => updateProductEdit(p.id, "categoryId", e.target.value)} list="mart-category-options" /></td>
                        <td>{veg ? <span className="mv-pill mv-pill-veg"><FaLeaf /> Veg</span> : <span className="mv-pill mv-pill-nonveg"><FaUtensils /> Non Veg</span>}</td>
                        <td><input className="input" value={safeText(edit.unit)} onChange={(e) => updateProductEdit(p.id, "unit", e.target.value)} /></td>
                        <td><input className="input" value={safeText(edit.price)} onChange={(e) => updateProductEdit(p.id, "price", e.target.value)} /></td>
                        <td>0%</td>
                        <td>₹{price.toFixed(0)}</td>
                        <td><input className="input" value={safeText(edit.mrp)} onChange={(e) => updateProductEdit(p.id, "mrp", e.target.value)} /></td>
                        <td>{mrp <= 0 || price >= mrp ? "0%" : `${(((mrp - price) / mrp) * 100).toFixed(1)}%`}</td>
                        <td><input className="input" value={safeText(edit.stock)} onChange={(e) => updateProductEdit(p.id, "stock", e.target.value)} /></td>
                        <td>{available ? <span className="mv-pill mv-pill-active">Active</span> : <span className="mv-pill mv-pill-inactive">Inactive</span>}</td>
                        <td className="mv-actions-cell">
                          <button className="mv-btn small mv-btn-primary" onClick={() => saveProductRow(edit)} type="button" disabled={busy}>Save</button>
                          <button className="mv-btn small mv-btn-danger" onClick={() => setDeleteProductTarget({ id: safeText(p?.id || ""), name: safeText(edit?.name || p?.name || "") })} type="button" disabled={busy}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!martProducts.length ? <tr><td colSpan={12} className="mv-empty">No products found.</td></tr> : null}
                </tbody>
              </table>
            </div>

            <Pagination
              page={productPage}
              totalPages={Math.max(1, Math.ceil(martProducts.length / PAGE_SIZE))}
              onChange={setProductPage}
            />
          </div>
        )}
      </div>
      {deleteProductTarget ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setDeleteProductTarget(null))}>
          <div className="modal card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">Delete product</h3>
            <div className="small">
              Remove <strong>{deleteProductTarget.name || deleteProductTarget.id}</strong> from this mart's
              catalogue? Customers stop seeing it immediately, and past orders keep their own copy of the item.
            </div>
            <div className="small mt-8"><strong>ID:</strong> {deleteProductTarget.id}</div>
            <div className="mt-12 flex-gap10">
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const id = deleteProductTarget.id;
                  setDeleteProductTarget(null);
                  await deleteProduct(id);
                }}
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
              <button className="btn" disabled={busy} onClick={() => setDeleteProductTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getRowPriceValue(row) {
  const directKeys = ["price", "price_per_night", "pricePerNight", "rate_per_km", "ratePerKm", "daily_rate", "dailyRate", "amount", "rent", "fare"];
  for (const k of directKeys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  const pricing = row?.pricing && typeof row.pricing === "object" ? row.pricing : safeJsonParse(row?.pricing || "") || {};
  const pv = pricing?.selling_price ?? pricing?.sellingPrice ?? pricing?.price ?? pricing?.market_price ?? pricing?.marketPrice;
  if (pv !== undefined && pv !== null && pv !== "" && !Number.isNaN(Number(pv))) return Number(pv);
  return null;
}

function withUpdatedRowPrice(row, nextPrice) {
  const out = { ...(row || {}) };
  const n = Math.max(0, Number(nextPrice || 0));
  const directKeys = ["price", "price_per_night", "pricePerNight", "rate_per_km", "ratePerKm", "daily_rate", "dailyRate", "amount", "rent", "fare"];
  let wroteDirect = false;
  for (const k of directKeys) {
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      out[k] = n;
      wroteDirect = true;
    }
  }
  let pricing = out?.pricing;
  if (typeof pricing === "string") pricing = safeJsonParse(pricing) || {};
  if (Array.isArray(pricing)) pricing = pricing[0] || {};
  if (pricing && typeof pricing === "object") {
    const market = Number(pricing.market_price ?? pricing.marketPrice ?? n);
    const cost = Number(pricing.cost_price ?? pricing.costPrice ?? 0);
    const safeSelling = Math.max(cost, n);
    out.pricing = {
      ...pricing,
      market_price: Number.isNaN(market) ? n : market,
      cost_price: Number.isNaN(cost) ? 0 : cost,
      selling_price: safeSelling
    };
  } else if (!wroteDirect) {
    out.price = n;
  }
  return out;
}

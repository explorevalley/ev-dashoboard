import React, { useEffect, useMemo, useState } from "react";
import PricingControlsWorkspace from "./PricingControlsWorkspace";
import {
  FaBed,
  FaBus,
  FaCar,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaDownload,
  FaHome,
  FaHotel,
  FaLock,
  FaMapMarkerAlt,
  FaPlus,
  FaRedo,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaStore,
  FaTable,
  FaUtensils,
  FaFileCode,
  FaPen,
  FaFileAlt,
  FaSignInAlt,
  FaBuilding,
  FaGoogle,
  FaEnvelopeOpenText,
  FaUsers,
  FaRobot,
  FaTruck,
  FaUndoAlt,
  FaEnvelope,
  FaComments,
  FaTelegramPlane,
  FaStar,
  FaMotorcycle,
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaTimes,
  FaPrint,
  FaShoppingBasket,
  FaPhoneAlt,
  FaEllipsisV,
  FaBullhorn
} from "react-icons/fa";

const PAGE_SIZE = 20;

function ActionMenuFloating({ anchor, dropUp, status, busy, canInvoice, onConfirm, onComplete, onCancel, onPrint, onDownload }) {
  const MENU_WIDTH = 240;
  const GAP = 8;
  const VIEWPORT_PAD = 10;
  const style = { position: "fixed", zIndex: 60, width: `${MENU_WIDTH}px` };
  let arrowLeft = MENU_WIDTH - 24;
  if (anchor) {
    const triggerCenterX = anchor.left + anchor.width / 2;
    let left = triggerCenterX - MENU_WIDTH / 2;
    const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_PAD;
    if (left > maxLeft) left = maxLeft;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    style.left = `${left}px`;
    arrowLeft = Math.max(14, Math.min(MENU_WIDTH - 24, triggerCenterX - left - 6));
    if (dropUp) style.bottom = `${window.innerHeight - anchor.top + GAP}px`;
    else style.top = `${anchor.bottom + GAP}px`;
  } else {
    style.top = "120px";
    style.right = "24px";
  }
  return (
    <div
      className={`action-menu action-menu-floating ${dropUp ? "drop-up" : ""}`}
      role="menu"
      style={style}
    >
      <span className="action-menu-arrow" style={{ left: `${arrowLeft}px` }} aria-hidden="true" />
      <button type="button" role="menuitem" className={`action-menu-item ${status === "confirmed" ? "is-current" : ""}`} disabled={busy} onClick={onConfirm}>
        <span className="action-menu-icon confirm"><FaCheck /></span>
        <span className="action-menu-label">Confirm order</span>
        {status === "confirmed" ? <span className="action-menu-tag">current</span> : null}
      </button>
      <button type="button" role="menuitem" className={`action-menu-item ${status === "completed" ? "is-current" : ""}`} disabled={busy} onClick={onComplete}>
        <span className="action-menu-icon complete"><FaCheckDouble /></span>
        <span className="action-menu-label">Mark complete</span>
        {status === "completed" ? <span className="action-menu-tag">current</span> : null}
      </button>
      <button type="button" role="menuitem" className="action-menu-item danger" disabled={busy} onClick={onCancel}>
        <span className="action-menu-icon cancel"><FaTimes /></span>
        <span className="action-menu-label">Cancel order</span>
      </button>
      <div className="action-menu-divider" />
      <button type="button" role="menuitem" className="action-menu-item" disabled={!canInvoice} title={canInvoice ? "" : "Available after Complete"} onClick={onPrint}>
        <span className="action-menu-icon ghost"><FaPrint /></span>
        <span className="action-menu-label">Print invoice</span>
      </button>
      <button type="button" role="menuitem" className="action-menu-item" disabled={!canInvoice} title={canInvoice ? "" : "Available after Complete"} onClick={onDownload}>
        <span className="action-menu-icon ghost"><FaDownload /></span>
        <span className="action-menu-label">Download invoice</span>
      </button>
    </div>
  );
}

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function displayText(v, fallback = "—") {
  const s = safeText(v);
  return s.trim() ? s : fallback;
}

function fileSizeBytes(fileLike) {
  const candidates = [
    fileLike?.sizeBytes,
    fileLike?.size,
    fileLike?.metadata?.size,
    fileLike?.metadata?.fileSize,
    fileLike?.metadata?.contentLength,
    fileLike?.metadata?.length
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function titleCaseLabel(raw) {
  const s = safeText(raw).trim();
  if (!s) return "";
  const cleaned = s
    .replace(/^ev_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  return words.map((w) => {
    const lw = w.toLowerCase();
    if (["id", "ip", "url", "kyc", "aadhaar", "api", "cms", "seo", "utc"].includes(lw)) return lw.toUpperCase();
    if (lw === "inr") return "INR";
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(" ");
}

const COMMON_COLUMN_LABELS = {
  id: "ID",
  code: "Code",
  slug: "Slug",
  title: "Title",
  name: "Name",
  description: "Description",
  content: "Content",
  email: "Email",
  phone: "Phone",
  user_id: "User ID",
  userId: "User ID",
  user_name: "Customer Name",
  userName: "Customer Name",
  restaurant_id: "Vendor ID",
  restaurantId: "Vendor ID",
  item_id: "Item ID",
  itemId: "Item ID",
  location: "Location",
  city: "City",
  price: "Price",
  price_per_night: "Price / Night",
  pricePerNight: "Price / Night",
  hero_image: "Hero Image",
  heroImage: "Hero Image",
  image: "Image",
  images: "Images",
  image_meta: "Image Details",
  imageMeta: "Image Details",
  rating: "Rating",
  review_count: "Reviews",
  reviews: "Reviews",
  available: "Available",
  active: "Active",
  status: "Status",
  created_at: "Created",
  updated_at: "Updated",
  booking_date: "Booking Date",
  order_time: "Order Time",
  submitted_at: "Submitted",
  responded_at: "Responded",
  ip_address: "IP Address",
  browser: "Browser",
  vendor_mobile: "Vendor Mobile",
  additional_comments: "Notes",
  price_dropped: "Discount Active",
  price_drop_percent: "Discount (%)",
  delivery_address: "Delivery Address",
  pickup_location: "Pickup Location",
  drop_location: "Drop Location",
  datetime: "Date/Time"
};

const TABLES = Object.freeze({
  SETTINGS: "opsSettings",
  PAYMENTS: "billingSettings",
  POLICIES: "policyPages",
  SITE_PAGES: "contentPages",
  FESTIVALS: "festivalDeck",
  TOURS: "tourDeck",
  HOTELS: "stayCatalog",
  RESTAURANTS: "foodPartners",
  MARTS: "martPartners",
  PRODUCTS: "martProducts",
  MENU_ITEMS: "foodItems",
  FOOD_ORDERS: "foodOrders",
  MART_ORDERS: "martOrders",
  BOOKINGS: "travelBookings",
  CAB_BOOKINGS: "cabBookings",
  BUS_BOOKINGS: "busBookings",
  BIKE_BOOKINGS: "bikeBookings",
  CAB_PROVIDERS: "cabPartners",
  TAXI_FARES: "taxiFares",
  BIKE_RENTALS: "bikeRentals",
  BUSES: "busRoutes",
  USER_PROFILES: "userProfiles",
  USER_BEHAVIOR_PROFILES: "userSignals",
  ANALYTICS_EVENTS: "securityEvents",
  QUERIES: "supportQueries",
  INVOICES: "invoiceLedger",
  AUDIT_LOG: "auditTrail",
  COUPONS: "promoCodes",
  SERVICE_AREAS: "serviceZones",
  TELEGRAM_MESSAGES: "telegramLogs",
  AI_CONVERSATIONS: "aiChats",
  DELIVERY_TRACKING: "deliveryTracking",
  DELIVERY_PINCODES: "deliveryPincodes",
  USER_ADDRESSES: "customerAddresses",
  VENDOR_MESSAGES: "vendorComms",
  EMAIL_NOTIFICATIONS: "emailOutbox",
  REVIEWS: "reviewsBoard",
  DUTY_REQUESTS: "ev_duty_requests",
  REFUNDS: "refundQueue"
});

const TABLE_LABELS = {
  [TABLES.SETTINGS]: "Settings",
  [TABLES.PAYMENTS]: "Payments",
  [TABLES.POLICIES]: "Policies",
  [TABLES.SITE_PAGES]: "Site Pages",
  [TABLES.FESTIVALS]: "Festivals",
  [TABLES.TOURS]: "Tours",
  [TABLES.HOTELS]: "Hotels & Cottages",
  [TABLES.RESTAURANTS]: "Food Vendors",
  [TABLES.MARTS]: "Marts",
  [TABLES.PRODUCTS]: "Products",
  [TABLES.MENU_ITEMS]: "Menu Items",
  [TABLES.FOOD_ORDERS]: "Food Orders",
  [TABLES.MART_ORDERS]: "Mart Orders",
  [TABLES.BOOKINGS]: "Hotel Booking",
  [TABLES.CAB_BOOKINGS]: "Cab Bookings",
  [TABLES.BUS_BOOKINGS]: "Bus Bookings",
  [TABLES.BIKE_BOOKINGS]: "Bike Bookings",
  [TABLES.CAB_PROVIDERS]: "Cab Providers",
  [TABLES.TAXI_FARES]: "Taxi Fares",
  [TABLES.BIKE_RENTALS]: "Bike Rentals",
  [TABLES.BUSES]: "Buses",
  [TABLES.USER_PROFILES]: "Customer Profiles",
  [TABLES.USER_BEHAVIOR_PROFILES]: "Customer Signals",
  [TABLES.ANALYTICS_EVENTS]: "Security Events",
  [TABLES.QUERIES]: "Enquiries",
  [TABLES.INVOICES]: "Invoices",
  [TABLES.AUDIT_LOG]: "Audit Log",
  [TABLES.COUPONS]: "Coupons",
  [TABLES.SERVICE_AREAS]: "Service Areas",
  [TABLES.TELEGRAM_MESSAGES]: "Telegram Messages",
  [TABLES.AI_CONVERSATIONS]: "AI Conversations",
  [TABLES.DELIVERY_TRACKING]: "Delivery Tracking",
  [TABLES.DELIVERY_PINCODES]: "Delivery Pincodes",
  [TABLES.USER_ADDRESSES]: "Customer Addresses",
  [TABLES.VENDOR_MESSAGES]: "Vendor Messages",
  [TABLES.EMAIL_NOTIFICATIONS]: "Email Notifications",
  [TABLES.REVIEWS]: "Reviews",
  [TABLES.REFUNDS]: "Refunds"
};

const DB_TABLE_BY_ALIAS = Object.freeze({
  [TABLES.SETTINGS]: "ev_settings",
  [TABLES.PAYMENTS]: "ev_payments",
  [TABLES.POLICIES]: "ev_policies",
  [TABLES.SITE_PAGES]: "ev_site_pages",
  [TABLES.FESTIVALS]: "ev_festivals",
  [TABLES.TOURS]: "ev_tours",
  [TABLES.HOTELS]: "ev_hotels",
  [TABLES.RESTAURANTS]: "ev_food_vendors",
  [TABLES.MARTS]: "ev_mart_partners",
  [TABLES.PRODUCTS]: "ev_mart_products",
  [TABLES.MENU_ITEMS]: "ev_food_menu_items",
  [TABLES.FOOD_ORDERS]: "ev_food_orders",
  [TABLES.MART_ORDERS]: "ev_mart_orders",
  [TABLES.BOOKINGS]: "ev_bookings",
  [TABLES.CAB_BOOKINGS]: "ev_cab_bookings",
  [TABLES.BUS_BOOKINGS]: "ev_bus_bookings",
  [TABLES.BIKE_BOOKINGS]: "ev_rental_bookings",
  [TABLES.CAB_PROVIDERS]: "ev_cab_rates",
  [TABLES.TAXI_FARES]: "ev_taxi_fares",
  [TABLES.BIKE_RENTALS]: "ev_rental_vehicles",
  [TABLES.BUSES]: "ev_buses",
  [TABLES.USER_PROFILES]: "ev_user_profiles",
  [TABLES.USER_BEHAVIOR_PROFILES]: "ev_user_behavior_profiles",
  [TABLES.ANALYTICS_EVENTS]: "ev_analytics_events",
  [TABLES.QUERIES]: "ev_queries",
  [TABLES.INVOICES]: "ev_invoices",
  [TABLES.AUDIT_LOG]: "ev_audit_log",
  [TABLES.COUPONS]: "ev_coupons",
  [TABLES.SERVICE_AREAS]: "ev_service_areas",
  [TABLES.TELEGRAM_MESSAGES]: "ev_telegram_messages",
  [TABLES.AI_CONVERSATIONS]: "ev_ai_conversations",
  [TABLES.DELIVERY_TRACKING]: "ev_delivery_tracking",
  [TABLES.DELIVERY_PINCODES]: "ev_delivery_pincodes",
  [TABLES.USER_ADDRESSES]: "ev_user_addresses",
  [TABLES.VENDOR_MESSAGES]: "ev_vendor_messages",
  [TABLES.EMAIL_NOTIFICATIONS]: "ev_email_notifications",
  [TABLES.REVIEWS]: "ev_reviews",
  [TABLES.REFUNDS]: "ev_refunds"
});

const ALIAS_BY_DB_TABLE = Object.freeze(
  Object.fromEntries(Object.entries(DB_TABLE_BY_ALIAS).map(([alias, db]) => [db, alias]))
);

function tableAlias(tableName) {
  const key = safeText(tableName);
  return ALIAS_BY_DB_TABLE[key] || key;
}

function tableDb(tableName) {
  const key = safeText(tableName);
  return DB_TABLE_BY_ALIAS[key] || key;
}

function tableLabel(tableName) {
  const key = tableAlias(tableName);
  return TABLE_LABELS[key] || titleCaseLabel(key);
}

function columnLabel(tableName, colName) {
  const key = safeText(colName);
  return COMMON_COLUMN_LABELS[key] || titleCaseLabel(key);
}

function safeJsonParse(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (!(t.startsWith("{") || t.startsWith("["))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function uniqStrings(list) {
  const out = [];
  const seen = new Set();
  (list || []).forEach((x) => {
    const s = safeText(x).trim();
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  return out;
}

function normalizeStringList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => safeText(x)).filter((x) => x.trim());
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => safeText(x)).filter((x) => x.trim());
    return raw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeObjectList(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === "object");
  }
  return [];
}

function parseBikePricingAmount(pricing) {
  if (!pricing) return "";
  const parsed = typeof pricing === "string" ? (safeJsonParse(pricing) || {}) : pricing;
  return safeText(parsed?.estimatedAmount ?? parsed?.totalAmount ?? parsed?.total ?? "");
}

function parseCabAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cabAmountFromPricing(pricing) {
  if (!pricing) return 0;
  const parsed = typeof pricing === "string" ? (safeJsonParse(pricing) || {}) : pricing;
  if (!parsed || typeof parsed !== "object") return 0;
  return parseCabAmount(
    parsed?.totalAmount ??
    parsed?.total_amount ??
    parsed?.estimatedAmount ??
    parsed?.estimated_amount ??
    parsed?.fare ??
    parsed?.amount
  );
}

function cabRateAmountForVehicle(rateRow, vehicleType) {
  if (!rateRow || typeof rateRow !== "object") return 0;
  const vt = safeText(vehicleType).toLowerCase();
  const ordinary4 = parseCabAmount(rateRow?.ordinary_4_1 ?? rateRow?.ordinary4_1);
  const luxury4 = parseCabAmount(rateRow?.luxury_4_1 ?? rateRow?.luxury4_1);
  const ordinary6 = parseCabAmount(rateRow?.ordinary_6_1 ?? rateRow?.ordinary6_1);
  const luxury6 = parseCabAmount(rateRow?.luxury_6_1 ?? rateRow?.luxury6_1);
  const traveller = parseCabAmount(rateRow?.traveller);

  if (vt.includes("traveller")) return traveller || ordinary6 || luxury6 || ordinary4 || luxury4;
  if (vt.includes("luxury")) return luxury4 || luxury6 || ordinary4 || ordinary6 || traveller;
  if (vt.includes("6") || vt.includes("suv")) return ordinary6 || luxury6 || ordinary4 || luxury4 || traveller;
  return ordinary4 || luxury4 || ordinary6 || luxury6 || traveller;
}

function resolveCabBookingFare(row, cabRatesById) {
  const pricingAmount = cabAmountFromPricing(row?.pricing);
  const estimatedFare = parseCabAmount(row?.estimated_fare ?? row?.estimatedFare);
  const totalFare = parseCabAmount(row?.total_fare ?? row?.totalFare);
  const directFare = [pricingAmount, totalFare, estimatedFare].find((x) => x > 1) || 0;
  if (directFare > 0) return String(directFare);

  const rateId = safeText(row?.rate_id || row?.rateId || row?.item_id || row?.itemId);
  const rateRow = rateId ? cabRatesById?.get(rateId) : null;
  const routeFare = cabRateAmountForVehicle(rateRow, row?.vehicle_type || row?.vehicleType);
  if (routeFare > 0) return String(routeFare);

  const fallback = [pricingAmount, totalFare, estimatedFare].find((x) => x > 0) || 0;
  return fallback > 0 ? String(fallback) : "";
}

export const HOTEL_SPACE_FACILITY_OPTIONS = Object.freeze({
  private_spaces: ["Private Bedroom", "Attached Bathroom", "Private Balcony", "Private Sitout"],
  shared_spaces: ["Shared Lounge"],
  room_amenities: ["King Bed", "Wardrobe", "Work Desk", "Electric Kettle", "Room Heater"],
  popular_with_guests: ["Mountain View", "Family Friendly", "Peaceful Stay", "Couple Friendly", "Scenic Location"],
  room_features: ["Valley View", "Large Windows", "Wooden Interiors", "Soundproof Room"],
  basic_facilities: ["WiFi", "Power Backup", "Housekeeping", "Parking", "Hot Water"],
  beds_and_blanket: ["Extra Blanket", "Comforter", "Premium Mattress", "Extra Pillows"],
  food_and_drinks: ["Restaurant", "In-room Dining"],
  safety_and_security: ["CCTV", "First Aid Kit", "Fire Extinguisher", "24x7 Caretaker"],
  media_and_entertainment: ["Smart TV", "Streaming Apps", "Bluetooth Speaker", "Board Games"],
  bathroom: ["Geyser", "Towels", "Toiletries", "Mirror"],
  other_facilities: ["Bonfire Area", "Garden", "Airport Pickup", "Laundry", "Pet Friendly"],
  inclusion: ["WiFi", "Parking"]
});


export function ListEditor({ title, values, onChange, placeholder = "Add item...", quickAddItems = [] }) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(values) ? values : [];
  const addValue = (raw) => {
    const v = safeText(raw).trim();
    if (!v) return;
    onChange(uniqStrings([...(list || []), v]));
  };
  const add = () => {
    addValue(draft);
    setDraft("");
  };
  const removeAt = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };
  return (
    <div className="field full">
      <label>{title}</label>
      <div className="list-editor-row">
        <input
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="btn small" onClick={add}><FaPlus /> Add</button>
      </div>
      {quickAddItems.length ? (
        <div className="chip-wrap">
          {quickAddItems.map((item) => {
            const exists = list.some((x) => safeText(x).trim().toLowerCase() === safeText(item).trim().toLowerCase());
            return (
              <button
                key={`quick-${title}-${item}`}
                type="button"
                className="chip quick-add-chip"
                disabled={exists}
                onClick={() => addValue(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="chip-wrap">
        {(list || []).map((item, idx) => (
          <span key={`${item}-${idx}`} className="chip">
            {item}
            <button type="button" className="chip-x" onClick={() => removeAt(idx)} aria-label="Remove item">x</button>
          </span>
        ))}
        {!list.length ? <span className="small">No items yet.</span> : null}
      </div>
    </div>
  );
}

export function FestivalGalleryEditor({
  images,
  titles,
  descriptions,
  onChange,
  uploadFolder = "images/gallery",
  onPickFromBucket,
  imageOnly = false
}) {
  const rowsFromProps = useMemo(() => {
    const img = normalizeStringList(images);
    const ttl = normalizeStringList(titles);
    const desc = normalizeStringList(descriptions);
    const count = Math.max(img.length, ttl.length, desc.length, 1);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push({
        image: safeText(img[i]),
        title: safeText(ttl[i]),
        description: safeText(desc[i])
      });
    }
    return out;
  }, [images, titles, descriptions]);
  const [rows, setRows] = useState(rowsFromProps);

  useEffect(() => {
    setRows(rowsFromProps);
  }, [rowsFromProps]);

  const applyRows = (nextRows) => {
    const normalized = (nextRows || [])
      .map((r) => ({
        image: safeText(r?.image).trim(),
        title: safeText(r?.title).trim(),
        description: safeText(r?.description).trim()
      }));
    const cleaned = normalized.filter((r) => {
      if (imageOnly) return !!r.image;
      return r.image || r.title || r.description;
    });
    onChange({
      images: cleaned.map((r) => r.image).filter(Boolean),
      image_titles: cleaned.map((r) => (imageOnly ? "" : r.title)),
      image_descriptions: cleaned.map((r) => (imageOnly ? "" : r.description)),
      image_meta: cleaned.map((r) => ({ url: r.image, title: imageOnly ? "" : r.title, description: imageOnly ? "" : r.description }))
    });
  };

  const update = (index, key, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, [key]: value } : r));
      applyRows(next);
      return next;
    });
  };

  const removeAt = (index) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const finalRows = next.length ? next : [{ image: "", title: "", description: "" }];
      applyRows(finalRows);
      return finalRows;
    });
  };

  const uploadGalleryImage = async (index, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", safeText(uploadFolder) || "images/gallery");
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      update(index, "image", j.url || j.path || "");
    } catch (err) {
      alert(String(err?.message || err));
    }
  };

  return (
    <div className="field full">
      <label>Gallery</label>
      <div className="gallery-grid">
        {rows.map((r, idx) => (
          <div key={`gallery-${idx}`} className="gallery-card">
            <div className="gallery-head">
              <span>Image {idx + 1}</span>
              <button type="button" className="btn small danger" onClick={() => removeAt(idx)}>Remove</button>
            </div>
            <div className="field">
              <label>Image</label>
              <div className="flex-gap10-center">
                <input className="input flex-1" value={r.image} readOnly placeholder="Upload image" />
                <label className="btn small pointer">
                  Upload
                  <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadGalleryImage(idx, e.target.files?.[0])} />
                </label>
                {typeof onPickFromBucket === "function" ? (
                  <button type="button" className="btn small" onClick={() => onPickFromBucket(idx)}>Choose from Gallery</button>
                ) : null}
              </div>
            </div>
            {!imageOnly ? (
              <div className="field">
                <label>Title</label>
                <input className="input" value={r.title} onChange={(e) => update(idx, "title", e.target.value)} placeholder="Optional image title" />
              </div>
            ) : null}
            {!imageOnly ? (
              <div className="field">
                <label>Description</label>
                <textarea className="textarea gallery-textarea" value={r.description} onChange={(e) => update(idx, "description", e.target.value)} placeholder="Optional image note" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button
          type="button"
          className="btn small"
          onClick={() => setRows((prev) => [...(prev || []), { image: "", title: "", description: "" }])}
        >
          <FaPlus /> Add Image
        </button>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <div className="pagination">
      <button className="btn small" disabled={prevDisabled} onClick={() => onChange(page - 1)}>Prev</button>
      <div className="small">Page {page} / {totalPages}</div>
      <button className="btn small" disabled={nextDisabled} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

export function BucketLibraryModal({ open, folder, title, onClose, onPick, onPickMany, onCloseReason }) {
  const [prefix, setPrefix] = useState(safeText(folder) || "images/");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [renameDrafts, setRenameDrafts] = useState({});
  const [renamingPath, setRenamingPath] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const folderInputRef = React.useRef(null);

  const visibleFiles = useMemo(() => {
    const arr = [...(Array.isArray(files) ? files : [])];
    const q = safeText(query).trim().toLowerCase();
    const filtered = q
      ? arr.filter((f) => {
          const pathText = safeText(f?.objectPath || f?.name).toLowerCase();
          const urlText = safeText(f?.url || "").toLowerCase();
          return pathText.includes(q) || urlText.includes(q);
        })
      : arr;
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortBy === "size") {
        return (fileSizeBytes(a) - fileSizeBytes(b)) * dir;
      }
      if (sortBy === "name") {
        return safeText(a?.objectPath || a?.name).localeCompare(safeText(b?.objectPath || b?.name)) * dir;
      }
      const ta = new Date(safeText(a?.updatedAt || 0)).getTime() || 0;
      const tb = new Date(safeText(b?.updatedAt || 0)).getTime() || 0;
      return (ta - tb) * dir;
    });
    return filtered;
  }, [files, query, sortBy, sortDir]);

  const loadFiles = async (nextPrefix) => {
    const usePrefix = safeText(nextPrefix || prefix || "images/");
    setLoading(true);
    setError("");
    try {
      const j = await adminApiJson(`/api/admin/storage/list?prefix=${encodeURIComponent(usePrefix)}&limit=300`);
      setFiles(Array.isArray(j?.files) ? j.files : []);
    } catch (e) {
      setError(String(e?.message || e));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const next = safeText(folder) || "images/";
    setPrefix(next);
    setQuery("");
    setSelectedUrls([]);
    loadFiles(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folder]);

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, [open]);

  const uploadMany = async (pickedFiles) => {
    const list = Array.from(pickedFiles || []).filter(Boolean);
    if (!list.length) {
      setError("No files selected.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("images", f));
      fd.append("folder", safeText(prefix) || "images/");
      let usedBulk = true;
      try {
        await adminApiForm("/api/admin/upload-images", { method: "POST", body: fd });
      } catch {
        usedBulk = false;
      }
      if (!usedBulk) {
        // Compatibility fallback when bulk endpoint isn't available on the running server.
        const uploaded = [];
        for (const f of list) {
          const one = new FormData();
          one.append("image", f);
          one.append("folder", safeText(prefix) || "images/");
          const oneJson = await adminApiForm("/api/admin/upload-image", { method: "POST", body: one });
          uploaded.push({
            name: safeText(oneJson?.objectPath || oneJson?.path || f?.name),
            objectPath: safeText(oneJson?.objectPath || oneJson?.path || f?.name),
            url: safeText(oneJson?.url || ""),
            updatedAt: new Date().toISOString(),
            sizeBytes: Number(f?.size || 0),
            metadata: {}
          });
        }
        setFiles((prev) => {
          const combined = [...uploaded, ...(Array.isArray(prev) ? prev : [])];
          const seen = new Set();
          const out = [];
          for (const item of combined) {
            const u = safeText(item?.url || "");
            if (!u || seen.has(u)) continue;
            seen.add(u);
            out.push(item);
          }
          return out;
        });
        return;
      }
      await loadFiles(prefix);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const deleteOne = async (objectPath) => {
    const target = safeText(objectPath);
    if (!target) return;
    const ok = window.confirm(`Delete this file from bucket?\n${target}`);
    if (!ok) return;
    setError("");
    try {
      await adminApiJson("/api/admin/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: target })
      });
      setFiles((prev) => (Array.isArray(prev) ? prev.filter((x) => safeText(x?.objectPath) !== target) : []));
    } catch (e) {
      setError(String(e?.message || e));
    }
  };
  const fileNameFromPath = (p) => {
    const s = safeText(p);
    if (!s) return "";
    const i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(i + 1) : s;
  };
  const renameOne = async (objectPath, nextName) => {
    const target = safeText(objectPath);
    const name = safeText(nextName);
    if (!target || !name) return;
    setRenamingPath(target);
    setError("");
    try {
      const j = await adminApiJson("/api/admin/storage/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: target, newName: name })
      });
      const newPath = safeText(j?.newObjectPath || target);
      const newUrl = safeText(j?.url || "");
      setFiles((prev) => (Array.isArray(prev) ? prev.map((x) => {
        const p = safeText(x?.objectPath);
        if (p !== target) return x;
        return {
          ...x,
          name: fileNameFromPath(newPath),
          objectPath: newPath,
          url: newUrl || safeText(x?.url || "")
        };
      }) : []));
      setRenameDrafts((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setRenamingPath("");
    }
  };

  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (typeof onCloseReason === "function") onCloseReason("backdrop");
        onClose?.();
      }}
    >
      <div className="modal card maxw-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mt-0">{title || "Bucket Gallery"}</h3>
        <div className="form-grid">
          <div className="field full">
            <label>Folder Prefix</label>
            <div className="flex-gap10-center">
              <input className="input flex-1" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="images/hotels" />
              <button className="btn small" onClick={() => loadFiles(prefix)} disabled={loading || uploading}>Refresh</button>
            </div>
          </div>
          <div className="field full">
            <label>Upload Files</label>
            <div className="flex-gap10-center">
              <label className="btn small pointer">
                Upload Files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden-input"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    e.target.value = "";
                    uploadMany(picked);
                  }}
                />
              </label>
              <label className="btn small pointer">
                Upload Folder
                <input
                  ref={folderInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden-input"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    e.target.value = "";
                    uploadMany(picked);
                  }}
                />
              </label>
              {(loading || uploading) ? <span className="small">Working...</span> : <span className="small">{files.length} files</span>}
            </div>
          </div>
          <div className="field full">
            <label>Sort</label>
            <div className="flex-gap10-center">
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="updated">Updated Time</option>
                <option value="size">File Size</option>
                <option value="name">Path Name</option>
              </select>
              <button className="btn small" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                {sortDir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
          <div className="field full">
            <label>Search</label>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file path or URL"
            />
          </div>
        </div>
        {error ? <div className="err mt-10">{error}</div> : null}
        {selectedUrls.length ? (
          <div className="small mt-10">Selected: {selectedUrls.length}</div>
        ) : null}
        <div className="table-wrap mt-10" style={{ maxHeight: 420 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Preview</th>
                <th>Name</th>
                <th>Size</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((f) => (
                <tr key={safeText(f?.objectPath || f?.url)}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUrls.includes(safeText(f?.url || ""))}
                      onChange={(e) => {
                        const u = safeText(f?.url || "");
                        if (!u) return;
                        setSelectedUrls((prev) => {
                          const has = prev.includes(u);
                          if (e.target.checked && !has) return [...prev, u];
                          if (!e.target.checked && has) return prev.filter((x) => x !== u);
                          return prev;
                        });
                      }}
                    />
                  </td>
                  <td className="thumb-cell">{f?.url ? <img className="thumb" src={f.url} alt="" /> : null}</td>
                  <td>{displayText(fileNameFromPath(f?.objectPath || f?.name))}</td>
                  <td>{formatBytes(fileSizeBytes(f))}</td>
                  <td>{displayText(f?.updatedAt)}</td>
                  <td>
                    <div className="flex-gap6">
                      <input
                        className="input"
                        style={{ width: 180 }}
                        value={renameDrafts[safeText(f?.objectPath || "")] ?? fileNameFromPath(f?.objectPath || f?.name)}
                        onChange={(e) => {
                          const key = safeText(f?.objectPath || "");
                          const v = e.target.value;
                          setRenameDrafts((prev) => ({ ...prev, [key]: v }));
                        }}
                      />
                      <button
                        className="btn small"
                        disabled={renamingPath === safeText(f?.objectPath || "")}
                        onClick={() => renameOne(
                          safeText(f?.objectPath || ""),
                          renameDrafts[safeText(f?.objectPath || "")] ?? fileNameFromPath(f?.objectPath || f?.name)
                        )}
                      >
                        {renamingPath === safeText(f?.objectPath || "") ? "Renaming..." : "Rename"}
                      </button>
                      <button className="btn small primary" onClick={() => onPick?.(safeText(f?.url || ""))}>Use</button>
                      <button className="btn small danger" onClick={() => deleteOne(safeText(f?.objectPath || ""))}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!files.length ? (
                <tr>
                  <td colSpan="6" className="small">No files found for this folder.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-12">
          <button
            className="btn primary"
            disabled={!selectedUrls.length}
            onClick={() => {
              if (!selectedUrls.length) return;
              if (typeof onPickMany === "function") onPickMany(selectedUrls);
              else if (typeof onPick === "function") onPick(selectedUrls[0]);
            }}
          >
            Use Selected
          </button>
          <button
            className="btn"
            onClick={() => {
              if (typeof onCloseReason === "function") onCloseReason("close-button");
              onClose?.();
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function GalleryWorkspace() {
  const [prefix, setPrefix] = useState("images/");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [renameDrafts, setRenameDrafts] = useState({});
  const [renamingPath, setRenamingPath] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const folderInputRef = React.useRef(null);

  const visibleFiles = useMemo(() => {
    const arr = [...(Array.isArray(files) ? files : [])];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === "size") {
        return (fileSizeBytes(a) - fileSizeBytes(b)) * dir;
      }
      if (sortBy === "name") {
        return safeText(a?.objectPath || a?.name).localeCompare(safeText(b?.objectPath || b?.name)) * dir;
      }
      const ta = new Date(safeText(a?.updatedAt || 0)).getTime() || 0;
      const tb = new Date(safeText(b?.updatedAt || 0)).getTime() || 0;
      return (ta - tb) * dir;
    });
    return arr;
  }, [files, sortBy, sortDir]);

  const loadFiles = async (nextPrefix) => {
    const usePrefix = safeText(nextPrefix || prefix || "images/");
    setLoading(true);
    setError("");
    try {
      const j = await adminApiJson(`/api/admin/storage/list?prefix=${encodeURIComponent(usePrefix)}&limit=500`);
      setFiles(Array.isArray(j?.files) ? j.files : []);
    } catch (e) {
      setError(String(e?.message || e));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles("images/");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, []);

  const uploadMany = async (pickedFiles) => {
    const list = Array.from(pickedFiles || []).filter(Boolean);
    if (!list.length) {
      setError("No files selected.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("images", f));
      fd.append("folder", safeText(prefix) || "images/");
      let usedBulk = true;
      try {
        await adminApiForm("/api/admin/upload-images", { method: "POST", body: fd });
      } catch {
        usedBulk = false;
      }
      if (!usedBulk) {
        const uploaded = [];
        for (const f of list) {
          const one = new FormData();
          one.append("image", f);
          one.append("folder", safeText(prefix) || "images/");
          const oneJson = await adminApiForm("/api/admin/upload-image", { method: "POST", body: one });
          uploaded.push({
            name: safeText(oneJson?.objectPath || oneJson?.path || f?.name),
            objectPath: safeText(oneJson?.objectPath || oneJson?.path || f?.name),
            url: safeText(oneJson?.url || ""),
            updatedAt: new Date().toISOString(),
            sizeBytes: Number(f?.size || 0),
            metadata: {}
          });
        }
        setFiles((prev) => {
          const combined = [...uploaded, ...(Array.isArray(prev) ? prev : [])];
          const seen = new Set();
          const out = [];
          for (const item of combined) {
            const u = safeText(item?.url || "");
            if (!u || seen.has(u)) continue;
            seen.add(u);
            out.push(item);
          }
          return out;
        });
        return;
      }
      await loadFiles(prefix);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url) => {
    const next = safeText(url);
    if (!next) return;
    try {
      await navigator.clipboard.writeText(next);
      setCopiedUrl(next);
      setTimeout(() => setCopiedUrl(""), 2000);
    } catch {
      setCopiedUrl("");
      setError("Unable to copy URL. Please copy manually.");
    }
  };

  const deleteOne = async (objectPath) => {
    const target = safeText(objectPath);
    if (!target) return;
    const ok = window.confirm(`Delete this file from bucket?\n${target}`);
    if (!ok) return;
    setError("");
    try {
      await adminApiJson("/api/admin/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: target })
      });
      setFiles((prev) => (Array.isArray(prev) ? prev.filter((x) => safeText(x?.objectPath) !== target) : []));
    } catch (e) {
      setError(String(e?.message || e));
    }
  };
  const fileNameFromPath = (p) => {
    const s = safeText(p);
    if (!s) return "";
    const i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(i + 1) : s;
  };
  const renameOne = async (objectPath, nextName) => {
    const target = safeText(objectPath);
    const name = safeText(nextName);
    if (!target || !name) return;
    setRenamingPath(target);
    setError("");
    try {
      const j = await adminApiJson("/api/admin/storage/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: target, newName: name })
      });
      const newPath = safeText(j?.newObjectPath || target);
      const newUrl = safeText(j?.url || "");
      setFiles((prev) => (Array.isArray(prev) ? prev.map((x) => {
        const p = safeText(x?.objectPath);
        if (p !== target) return x;
        return {
          ...x,
          name: fileNameFromPath(newPath),
          objectPath: newPath,
          url: newUrl || safeText(x?.url || "")
        };
      }) : []));
      setRenameDrafts((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setRenamingPath("");
    }
  };

  return (
    <div className="card">
      <h3 className="mt-0">Bucket Gallery</h3>
      <div className="small">Upload files/folders directly to storage and reuse URLs anywhere in admin forms.</div>
      <div className="form-grid mt-10">
        <div className="field full">
          <label>Folder Prefix</label>
          <div className="flex-gap10-center">
            <input className="input flex-1" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="images/hotels" />
            <button className="btn small" onClick={() => loadFiles(prefix)} disabled={loading || uploading}><FaRedo /> Refresh</button>
          </div>
        </div>
        <div className="field full">
          <label>Upload</label>
          <div className="flex-gap10-center">
            <label className="btn small pointer">
              <FaDownload /> Upload Files
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden-input"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  e.target.value = "";
                  uploadMany(picked);
                }}
              />
            </label>
            <label className="btn small pointer">
              <FaDownload /> Upload Folder
              <input
                ref={folderInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden-input"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  e.target.value = "";
                  uploadMany(picked);
                }}
              />
            </label>
            {(loading || uploading) ? <span className="small">Working...</span> : <span className="small">{files.length} files</span>}
          </div>
        </div>
        <div className="field full">
          <label>Sort</label>
          <div className="flex-gap10-center">
            <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="updated">Updated Time</option>
              <option value="size">File Size</option>
              <option value="name">Path Name</option>
            </select>
            <button className="btn small" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>
      </div>
      {error ? <div className="warn mt-10">{error}</div> : null}
      <div className="table-wrap mt-10">
        <table className="table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name</th>
              <th>Size</th>
              <th>URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFiles.map((f) => {
              const u = safeText(f?.url || "");
              return (
                <tr key={safeText(f?.objectPath || u)}>
                  <td className="thumb-cell">{u ? <img className="thumb" src={u} alt="" /> : null}</td>
                  <td>{displayText(fileNameFromPath(f?.objectPath || f?.name))}</td>
                  <td>{formatBytes(fileSizeBytes(f))}</td>
                  <td className="small">{u ? `${u.slice(0, 90)}${u.length > 90 ? "..." : ""}` : "—"}</td>
                  <td>
                    <div className="flex-gap6">
                      <input
                        className="input"
                        style={{ width: 180 }}
                        value={renameDrafts[safeText(f?.objectPath || "")] ?? fileNameFromPath(f?.objectPath || f?.name)}
                        onChange={(e) => {
                          const key = safeText(f?.objectPath || "");
                          const v = e.target.value;
                          setRenameDrafts((prev) => ({ ...prev, [key]: v }));
                        }}
                      />
                      <button
                        className="btn small"
                        disabled={renamingPath === safeText(f?.objectPath || "")}
                        onClick={() => renameOne(
                          safeText(f?.objectPath || ""),
                          renameDrafts[safeText(f?.objectPath || "")] ?? fileNameFromPath(f?.objectPath || f?.name)
                        )}
                      >
                        {renamingPath === safeText(f?.objectPath || "") ? "Renaming..." : "Rename"}
                      </button>
                      <button className="btn small" onClick={() => copyUrl(u)}>
                        {copiedUrl === u ? "Copied" : "Copy URL"}
                      </button>
                      <button className="btn small danger" onClick={() => deleteOne(safeText(f?.objectPath || ""))}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!files.length ? (
              <tr>
                <td colSpan="5" className="small">No files found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CabRatesTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    name: "",
    section: "",
    origin: "",
    destination: "",
    route_label: "",
    ordinary_4_1: "",
    luxury_4_1: "",
    ordinary_6_1: "",
    luxury_6_1: "",
    traveller: "",
    vehicle_type: "",
    plate_number: "",
    capacity: "",
    vendor_mobile: "",
    additional_comments: "",
    price_dropped: false,
    price_drop_percent: "",
    hero_image: "",
    active: true,
    service_area_id: ""
  });

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `cab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const origin = safeText(row?.origin || "").trim() || "Unknown";
    const destination = safeText(row?.destination || "").trim() || "Unknown";
    const fallbackRoute = safeText(row?.route_label || `${origin} to ${destination}`.trim()) || `${origin} to ${destination}`;
    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const payload = {
      id,
      name: safeText(row?.name || fallbackRoute || ""),
      section: safeText(row?.section || "General"),
      origin,
      destination,
      route_label: fallbackRoute,
      ordinary_4_1: toNumber(row?.ordinary_4_1),
      luxury_4_1: toNumber(row?.luxury_4_1),
      ordinary_6_1: toNumber(row?.ordinary_6_1),
      luxury_6_1: toNumber(row?.luxury_6_1),
      traveller: toNumber(row?.traveller),
      vehicle_type: safeText(row?.vehicle_type || ""),
      plate_number: safeText(row?.plate_number || ""),
      capacity: toNumber(row?.capacity),
      vendor_mobile: safeText(row?.vendor_mobile || ""),
      additional_comments: safeText(row?.additional_comments || ""),
      price_dropped: row?.price_dropped === true,
      price_drop_percent: toNumber(row?.price_drop_percent),
      hero_image: safeText(row?.hero_image || ""),
      active: row?.active !== false,
      service_area_id: safeText(row?.service_area_id || "")
    };
    setBusyId(id);
    setError("");
    try {
      await onUpsert(TABLES.CAB_PROVIDERS, [payload]);
      if (onReload) await onReload();
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        name: "",
        section: "",
        origin: "",
        destination: "",
        route_label: "",
        ordinary_4_1: "",
        luxury_4_1: "",
        ordinary_6_1: "",
        luxury_6_1: "",
        traveller: "",
        vehicle_type: "",
        plate_number: "",
        capacity: "",
        vendor_mobile: "",
        additional_comments: "",
        price_dropped: false,
        price_drop_percent: "",
        hero_image: "",
        active: true,
        service_area_id: ""
      });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this cab rate");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    setError("");
    try {
      await onDelete(TABLES.CAB_PROVIDERS, id, "id", confirmText);
      if (onReload) await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Destination</th>
            <th>Route</th>
            <th>Ord 4+1</th>
            <th>Lux 4+1</th>
            <th>Ord 6+1</th>
            <th>Lux 6+1</th>
            <th>Traveller</th>
            <th>Vehicle Type</th>
            <th>Capacity</th>
            <th>Vendor Mobile</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input className="input" value={newRow.origin} onChange={(e) => setNewRow((p) => ({ ...p, origin: e.target.value }))} placeholder="Origin" /></td>
            <td><input className="input" value={newRow.destination} onChange={(e) => setNewRow((p) => ({ ...p, destination: e.target.value }))} placeholder="Destination" /></td>
            <td><input className="input" value={newRow.route_label} onChange={(e) => setNewRow((p) => ({ ...p, route_label: e.target.value }))} placeholder="Route label" /></td>
            <td><input className="input" value={newRow.ordinary_4_1} onChange={(e) => setNewRow((p) => ({ ...p, ordinary_4_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.luxury_4_1} onChange={(e) => setNewRow((p) => ({ ...p, luxury_4_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.ordinary_6_1} onChange={(e) => setNewRow((p) => ({ ...p, ordinary_6_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.luxury_6_1} onChange={(e) => setNewRow((p) => ({ ...p, luxury_6_1: e.target.value }))} /></td>
            <td><input className="input" value={newRow.traveller} onChange={(e) => setNewRow((p) => ({ ...p, traveller: e.target.value }))} /></td>
            <td><input className="input" value={newRow.vehicle_type} onChange={(e) => setNewRow((p) => ({ ...p, vehicle_type: e.target.value }))} /></td>
            <td><input className="input" value={newRow.capacity} onChange={(e) => setNewRow((p) => ({ ...p, capacity: e.target.value }))} /></td>
            <td><input className="input" value={newRow.vendor_mobile} onChange={(e) => setNewRow((p) => ({ ...p, vendor_mobile: e.target.value }))} /></td>
            <td><input type="checkbox" checked={newRow.active !== false} onChange={(e) => setNewRow((p) => ({ ...p, active: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td><input className="input" value={safeText(edit.origin)} onChange={(e) => updateEdit(r.id, "origin", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.destination)} onChange={(e) => updateEdit(r.id, "destination", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.route_label)} onChange={(e) => updateEdit(r.id, "route_label", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.ordinary_4_1)} onChange={(e) => updateEdit(r.id, "ordinary_4_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.luxury_4_1)} onChange={(e) => updateEdit(r.id, "luxury_4_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.ordinary_6_1)} onChange={(e) => updateEdit(r.id, "ordinary_6_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.luxury_6_1)} onChange={(e) => updateEdit(r.id, "luxury_6_1", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.traveller)} onChange={(e) => updateEdit(r.id, "traveller", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vehicle_type)} onChange={(e) => updateEdit(r.id, "vehicle_type", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.capacity)} onChange={(e) => updateEdit(r.id, "capacity", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vendor_mobile)} onChange={(e) => updateEdit(r.id, "vendor_mobile", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.active !== false} onChange={(e) => updateEdit(r.id, "active", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

export function BusesTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    operator_name: "",
    from_city: "",
    to_city: "",
    departure_time: "",
    arrival_time: "",
    duration_text: "",
    bus_type: "Non AC",
    fare: "",
    total_seats: "",
    hero_image: "",
    active: true
  });

  const uploadBusImage = async (file, onDone) => {
    if (!file) return;
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "images/buses");
      const j = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      onDone(j.url || j.path || "");
    } catch (err) {
      setError(String(err?.message || err));
    }
  };

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const toNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `bus_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const payload = {
      id,
      operator_name: safeText(row?.operator_name || ""),
      operator_code: safeText(row?.operator_code || ""),
      from_city: safeText(row?.from_city || ""),
      from_code: safeText(row?.from_code || ""),
      to_city: safeText(row?.to_city || ""),
      to_code: safeText(row?.to_code || ""),
      departure_time: safeText(row?.departure_time || ""),
      arrival_time: safeText(row?.arrival_time || ""),
      duration_text: safeText(row?.duration_text || ""),
      bus_type: safeText(row?.bus_type || "Non AC"),
      fare: toNumber(row?.fare, 0),
      total_seats: toNumber(row?.total_seats, 20),
      seat_layout: row?.seat_layout || [],
      service_dates: row?.service_dates || [],
      seats_booked_by_date: row?.seats_booked_by_date || {},
      hero_image: safeText(row?.hero_image || ""),
      active: row?.active !== false
    };
    setBusyId(id);
    setError("");
    try {
      await onUpsert(TABLES.BUSES, [payload]);
      if (onReload) await onReload();
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        operator_name: "",
        from_city: "",
        to_city: "",
        departure_time: "",
        arrival_time: "",
        duration_text: "",
        bus_type: "Non AC",
        fare: "",
        total_seats: "",
        hero_image: "",
        active: true
      });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this bus route");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    setError("");
    try {
      await onDelete(TABLES.BUSES, id, "id", confirmText);
      if (onReload) await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Operator</th>
            <th>From</th>
            <th>To</th>
            <th>Departure</th>
            <th>Arrival</th>
            <th>Duration</th>
            <th>Type</th>
            <th>Fare</th>
            <th>Seats</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="thumb-cell">
              {newRow.hero_image ? <img className="thumb" src={newRow.hero_image} alt="" /> : null}
              <label className="btn small pointer mt-4">
                Upload
                <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadBusImage(e.target.files?.[0], (url) => setNewRow((p) => ({ ...p, hero_image: url })))} />
              </label>
            </td>
            <td><input className="input" value={newRow.operator_name} onChange={(e) => setNewRow((p) => ({ ...p, operator_name: e.target.value }))} placeholder="Operator" /></td>
            <td><input className="input" value={newRow.from_city} onChange={(e) => setNewRow((p) => ({ ...p, from_city: e.target.value }))} placeholder="From" /></td>
            <td><input className="input" value={newRow.to_city} onChange={(e) => setNewRow((p) => ({ ...p, to_city: e.target.value }))} placeholder="To" /></td>
            <td><input className="input" value={newRow.departure_time} onChange={(e) => setNewRow((p) => ({ ...p, departure_time: e.target.value }))} placeholder="06:30" /></td>
            <td><input className="input" value={newRow.arrival_time} onChange={(e) => setNewRow((p) => ({ ...p, arrival_time: e.target.value }))} placeholder="12:30" /></td>
            <td><input className="input" value={newRow.duration_text} onChange={(e) => setNewRow((p) => ({ ...p, duration_text: e.target.value }))} placeholder="6h" /></td>
            <td><input className="input" value={newRow.bus_type} onChange={(e) => setNewRow((p) => ({ ...p, bus_type: e.target.value }))} placeholder="Non AC" /></td>
            <td><input className="input" value={newRow.fare} onChange={(e) => setNewRow((p) => ({ ...p, fare: e.target.value }))} placeholder="0" /></td>
            <td><input className="input" value={newRow.total_seats} onChange={(e) => setNewRow((p) => ({ ...p, total_seats: e.target.value }))} placeholder="20" /></td>
            <td><input type="checkbox" checked={newRow.active !== false} onChange={(e) => setNewRow((p) => ({ ...p, active: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td className="thumb-cell">
                  {edit.hero_image ? <img className="thumb" src={edit.hero_image} alt="" /> : null}
                  <label className="btn small pointer mt-4">
                    Upload
                    <input type="file" accept="image/*" className="hidden-input" onChange={(e) => uploadBusImage(e.target.files?.[0], (url) => updateEdit(r.id, "hero_image", url))} />
                  </label>
                </td>
                <td><input className="input" value={safeText(edit.operator_name)} onChange={(e) => updateEdit(r.id, "operator_name", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.from_city)} onChange={(e) => updateEdit(r.id, "from_city", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.to_city)} onChange={(e) => updateEdit(r.id, "to_city", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.departure_time)} onChange={(e) => updateEdit(r.id, "departure_time", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.arrival_time)} onChange={(e) => updateEdit(r.id, "arrival_time", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.duration_text)} onChange={(e) => updateEdit(r.id, "duration_text", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.bus_type)} onChange={(e) => updateEdit(r.id, "bus_type", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.fare)} onChange={(e) => updateEdit(r.id, "fare", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.total_seats)} onChange={(e) => updateEdit(r.id, "total_seats", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.active !== false} onChange={(e) => updateEdit(r.id, "active", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

export function BikeRentalsTable({ rows, onUpsert, onDelete, onReload }) {
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState({
    id: "",
    name: "",
    category: "",
    bike_model: "",
    max_days: "",
    availability_rates: "",
    vendor_details: "",
    pricing: "",
    available: true
  });

  const totalPages = Math.max(1, Math.ceil((rows || []).length / PAGE_SIZE));
  const pageRows = (rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateEdit = (id, key, value) => {
    setEdits((prev) => {
      const base = prev[id] || rows.find((r) => String(r.id) === String(id)) || {};
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const saveRow = async (row) => {
    const id = safeText(row?.id) || `bike_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const payload = {
      id,
      name: safeText(row?.name || ""),
      category: safeText(row?.category || ""),
      bike_model: safeText(row?.bike_model || ""),
      max_days: Number(row?.max_days || 0) || 0,
      availability_rates: safeText(row?.availability_rates || ""),
      vendor_details: safeText(row?.vendor_details || ""),
      pricing: safeText(row?.pricing || ""),
      available: row?.available !== false
    };
    setBusyId(id);
    try {
      await onUpsert(TABLES.BIKE_RENTALS, [payload]);
      setEdits((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setNewRow({
        id: "",
        name: "",
        category: "",
        bike_model: "",
        max_days: "",
        availability_rates: "",
        vendor_details: "",
        pricing: "",
        available: true
      });
    } finally {
      setBusyId("");
    }
  };

  const deleteRow = async (id) => {
    const confirmText = window.prompt("Type DELETE to remove this rental");
    if (confirmText !== "DELETE") return;
    setBusyId(id);
    try {
      await onDelete(TABLES.BIKE_RENTALS, id, "id", confirmText);
      if (onReload) await onReload();
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="table-wrap mt-10">
      {error ? <div className="warn">{error}</div> : null}
      <table className="table menu-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Bike Model</th>
            <th>Max Days</th>
            <th>Availability Rates</th>
            <th>Pricing</th>
            <th>Vendor Details</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input className="input" value={newRow.name} onChange={(e) => setNewRow((p) => ({ ...p, name: e.target.value }))} placeholder="Name" /></td>
            <td><input className="input" value={newRow.category} onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))} placeholder="Category" /></td>
            <td><input className="input" value={newRow.bike_model} onChange={(e) => setNewRow((p) => ({ ...p, bike_model: e.target.value }))} placeholder="Model" /></td>
            <td><input className="input" value={newRow.max_days} onChange={(e) => setNewRow((p) => ({ ...p, max_days: e.target.value }))} placeholder="0" /></td>
            <td><input className="input" value={newRow.availability_rates} onChange={(e) => setNewRow((p) => ({ ...p, availability_rates: e.target.value }))} placeholder="₹1200/day" /></td>
            <td><input className="input" value={newRow.pricing} onChange={(e) => setNewRow((p) => ({ ...p, pricing: e.target.value }))} placeholder="₹1200/day" /></td>
            <td><input className="input" value={newRow.vendor_details} onChange={(e) => setNewRow((p) => ({ ...p, vendor_details: e.target.value }))} placeholder="Vendor details" /></td>
            <td><input type="checkbox" checked={newRow.available !== false} onChange={(e) => setNewRow((p) => ({ ...p, available: e.target.checked }))} /></td>
            <td><button className="btn small primary" onClick={() => saveRow(newRow)} disabled={!!busyId}>Save</button></td>
          </tr>
          {pageRows.map((r) => {
            const edit = edits[r.id] || r;
            return (
              <tr key={safeText(r.id || "")}>
                <td><input className="input" value={safeText(edit.name)} onChange={(e) => updateEdit(r.id, "name", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.category)} onChange={(e) => updateEdit(r.id, "category", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.bike_model)} onChange={(e) => updateEdit(r.id, "bike_model", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.max_days)} onChange={(e) => updateEdit(r.id, "max_days", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.availability_rates)} onChange={(e) => updateEdit(r.id, "availability_rates", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.pricing)} onChange={(e) => updateEdit(r.id, "pricing", e.target.value)} /></td>
                <td><input className="input" value={safeText(edit.vendor_details)} onChange={(e) => updateEdit(r.id, "vendor_details", e.target.value)} /></td>
                <td><input type="checkbox" checked={edit.available !== false} onChange={(e) => updateEdit(r.id, "available", e.target.checked)} /></td>
                <td>
                  <div className="flex-gap6">
                    <button className="btn small primary" onClick={() => saveRow(edit)} disabled={busyId === r.id}>Save</button>
                    <button className="btn small danger" onClick={() => deleteRow(r.id)} disabled={busyId === r.id}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

export function ObjectListEditor({ title, items, onChange, fields, addLabel = "Add Item" }) {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (idx, key, value) => {
    onChange(list.map((item, i) => (i === idx ? { ...(item || {}), [key]: value } : item)));
  };
  const removeAt = (idx) => onChange(list.filter((_, i) => i !== idx));
  const addNew = () => {
    const blank = {};
    fields.forEach((f) => {
      if (f.type === "number") blank[f.key] = null;
      else if (f.type === "boolean") blank[f.key] = true;
      else blank[f.key] = "";
    });
    onChange([...(list || []), blank]);
  };

  return (
    <div className="field full">
      <label>{title}</label>
      <div className="obj-grid">
        {list.map((item, idx) => (
          <div key={`${title}-${idx}`} className="obj-card">
            <div className="obj-head">
              <span>{title} #{idx + 1}</span>
              <button type="button" className="btn small danger" onClick={() => removeAt(idx)}>Remove</button>
            </div>
            {fields.map((f) => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="textarea gallery-textarea"
                    value={safeText(item?.[f.key])}
                    onChange={(e) => updateItem(idx, f.key, e.target.value)}
                    placeholder={f.placeholder || ""}
                  />
                ) : f.type === "boolean" ? (
                  <label className={`pill-toggle ${item?.[f.key] !== false ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={item?.[f.key] !== false}
                      onChange={(e) => updateItem(idx, f.key, e.target.checked)}
                    />
                    {item?.[f.key] !== false ? "On" : "Off"}
                  </label>
                ) : (
                  <input
                    className="input"
                    type={f.type === "number" ? "number" : "text"}
                    value={safeText(item?.[f.key])}
                    onChange={(e) => updateItem(idx, f.key, f.type === "number" ? Number(e.target.value || 0) : e.target.value)}
                    placeholder={f.placeholder || ""}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button type="button" className="btn small" onClick={addNew}><FaPlus /> {addLabel}</button>
      </div>
    </div>
  );
}

export function extractImageUrlsFromRow(row) {
  if (!row || typeof row !== "object") return [];
  const urls = [];
  const isLikelyImageUrl = (value) => {
    const s = safeText(value).trim();
    if (!s) return false;
    if (s.startsWith("/uploads/")) return false;
    const lower = s.toLowerCase();
    if (/\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)(\?|#|$)/i.test(lower)) return true;
    if (lower.includes("/storage/v1/object/public/")) return true;
    return false;
  };
  const take = (u) => {
    if (!u) return;
    if (Array.isArray(u)) { u.forEach(take); return; }
    if (typeof u === "object") {
      const cand = u.url || u.src || u.image || u.heroImage || u.hero_image;
      if (cand) take(cand);
      return;
    }
    const s = String(u || "").trim();
    if (!s) return;
    if (!isLikelyImageUrl(s)) return;
    urls.push(s);
  };

  const candidates = [
    row.hero_image, row.heroImage,
    row.image, row.main_image, row.mainImage,
    row.aadhaar_url, row.aadhaarUrl,
    row.avatar_url, row.avatarUrl,
    row.images, row.image_urls, row.imageUrls,
    row.image_meta, row.imageMeta
  ];

  candidates.forEach((c) => {
    if (typeof c === "string") {
      const parsed = safeJsonParse(c);
      if (parsed) take(parsed);
      else take(c);
    } else {
      take(c);
    }
  });

  return uniqStrings(urls);
}

export function keyColumnForTable(table) {
  const cols = (table?.columns || []).map((c) => c.name);
  const preferred = ["id", "code", "slug", "restaurant_id"];
  for (const p of preferred) if (cols.includes(p)) return p;
  return cols[0] || "id";
}

export function makeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function isLikelyCottage(row) {
  if (!row || typeof row !== "object") return false;
  const id = safeText(row.id).trim().toLowerCase();
  if (id.startsWith("cottage_")) return true;
  if (id.startsWith("hotel_")) return false;
  const name = safeText(row.name).trim().toLowerCase();
  const desc = safeText(row.description).trim().toLowerCase();
  if (name.includes("cottage") || desc.includes("cottage")) return true;
  const kind = safeText(row.property_type || row.propertyType || row.kind || row.type).trim().toLowerCase();
  if (kind === "cottage" || kind === "cottages") return true;
  return false;
}

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: FaHome },
  { key: "gallery", label: "Gallery", icon: FaFileCode },
  { key: "explorevalley", label: "ExploreValley", icon: FaFileAlt },
  { key: "tours", label: "Tours", icon: FaMapMarkerAlt },
  { key: "hotels", label: "Hotels", icon: FaHotel },
  { key: "cottages", label: "Cottages", icon: FaBed },
  { key: "food_vendors", label: "Food Vendors", icon: FaUtensils },
  { key: "mart_catalog", label: "ExploreValley Vendor Portal", icon: FaStore },
  { key: "cab_providers", label: "Cab Providers", icon: FaCar },
  { key: "bike_rentals", label: "Bike Rentals", icon: FaMotorcycle },
  { key: "duty_services", label: "Duty Services", icon: FaBuilding },
  { key: "duty_requests", label: "Duty Requests", icon: FaClipboardList },
  { key: "ad_banners", label: "Ads & Promos", icon: FaBullhorn },
  { key: "buses", label: "Buses", icon: FaBus },
  { key: "orders", label: "Orders", icon: FaStore },
  { key: "invoices", label: "Invoices", icon: FaFileAlt },
  { key: "delivery", label: "Delivery", icon: FaTruck },
  { key: "delivery_pincodes", label: "Delivery Pincodes", icon: FaMapMarkerAlt },
  { key: "customers", label: "Customers", icon: FaUsers },
  { key: "ai_support", label: "AI Support", icon: FaRobot },
  { key: "refunds", label: "Refunds", icon: FaUndoAlt },
  { key: "notifications", label: "Notifications", icon: FaEnvelope },
  { key: "tracking", label: "Tracking", icon: FaShieldAlt },
  { key: "analytics", label: "Analytics", icon: FaChartLine },
  { key: "settings", label: "Settings", icon: FaCog }
];

export const PAGE_TABLES = {
  gallery: [],
  explorevalley: [TABLES.FESTIVALS],
  tours: [TABLES.TOURS],
  hotels: [TABLES.HOTELS],
  cottages: [TABLES.HOTELS],
  food_vendors: [TABLES.RESTAURANTS, TABLES.MENU_ITEMS],
  mart_catalog: [TABLES.MARTS, TABLES.PRODUCTS],
  cab_providers: [TABLES.CAB_PROVIDERS, TABLES.TAXI_FARES],
  bike_rentals: [TABLES.BIKE_RENTALS],
  duty_services: ["ev_duty_services"],
  duty_requests: ["ev_duty_requests"],
  // The stats view rides along with the table so impressions and clicks land in
  // the same snapshot the list already renders from.
  ad_banners: ["ev_ad_banners", "ev_ad_banner_stats", "ev_promo_cards"],
  buses: [TABLES.BUSES, TABLES.BUS_BOOKINGS],
  customer_support: [TABLES.QUERIES],
  orders: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.FOOD_ORDERS, TABLES.MART_ORDERS, TABLES.INVOICES],
  invoices: [TABLES.INVOICES],
  delivery: [TABLES.DELIVERY_TRACKING, TABLES.VENDOR_MESSAGES],
  delivery_pincodes: [TABLES.DELIVERY_PINCODES],
  customers: [TABLES.USER_PROFILES, TABLES.USER_BEHAVIOR_PROFILES, TABLES.USER_ADDRESSES],
  ai_support: [TABLES.AI_CONVERSATIONS, TABLES.TELEGRAM_MESSAGES],
  refunds: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BIKE_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.FOOD_ORDERS, "ev_mart_orders", TABLES.REFUNDS],
  notifications: [TABLES.EMAIL_NOTIFICATIONS],
  tracking: [TABLES.ANALYTICS_EVENTS],
  analytics: [TABLES.ANALYTICS_EVENTS],
  settings: [TABLES.SITE_PAGES, TABLES.SETTINGS, TABLES.PAYMENTS, TABLES.POLICIES]
};

export const PAGE_TITLE = {
  dashboard: "Dashboard",
  gallery: "Gallery",
  explorevalley: "ExploreValley",
  tours: "Tours",
  hotels: "Hotels",
  cottages: "Cottages",
  food_vendors: "Food Vendors",
  mart_catalog: "ExploreValley Vendor Portal",
  cab_providers: "Cab Providers",
  bike_rentals: "Bike Rentals",
  duty_services: "Duty Services",
  duty_requests: "Duty Requests",
  ad_banners: "Ads & Promos",
  buses: "Buses",
  customer_support: "Customer Support",
  orders: "Orders",
  invoices: "Invoices",
  delivery: "Delivery Management",
  delivery_pincodes: "Delivery Pincodes",
  customers: "Customers",
  ai_support: "AI Support",
  refunds: "Refunds",
  notifications: "Notifications",
  tracking: "Tracking",
  analytics: "Analytics",
  settings: "Settings"
};

export function EnquiriesWorkspace({ table, onReload, onOpenImages, onUpsert }) {
  const [filter, setFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => String(r?.status || "pending") === filter);
  }, [rows, filter]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    if (!selectedId) return filtered[0];
    return filtered.find((r) => String(r?.id || "") === selectedId) || filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft("");
      return;
    }
    setSelectedId(String(selected.id || ""));
    setDraft(String(selected.response || ""));
  }, [selected?.id]);

  const saveResponse = async (status) => {
    if (!selected) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await onUpsert(TABLES.QUERIES, [{
        ...selected,
        response: draft ? String(draft) : null,
        responded_at: draft ? now : (selected.responded_at || null),
        status: status || (draft ? "resolved" : (selected.status || "pending"))
      }]);
      await onReload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="split">
      <div className="split-left">
        <div className="toolbar">
          <div className="seg">
            {["pending", "resolved", "spam", "all"].map((k) => (
              <button key={k} className={`btn small ${filter === k ? "primary" : "ghost"}`} onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="list">
          {filtered.length ? filtered.map((q) => (
            <button
              key={q.id}
              className={`list-item ${String(q.id) === String(selected?.id) ? "active" : ""}`}
              onClick={() => setSelectedId(String(q.id || ""))}
            >
              <div className="list-title">{safeText(q.subject || "Enquiry")}</div>
              <div className="small">{displayText(q.user_name || q.userName)} • {displayText(q.email)} • {displayText(q.phone)}</div>
              <div className={`badge ${String(q.status || "pending") === "pending" ? "warn" : "green"}`}>{safeText(q.status || "pending")}</div>
            </button>
          )) : (
            <div className="small small pad-12">No enquiries.</div>
          )}
        </div>
      </div>

      <div className="split-right">
        {!selected ? (
          <div className="card"><div className="small">No enquiry selected.</div></div>
        ) : (
          <div className="card">
            <div className="row">
              <h3 className="m-0">{safeText(selected.subject || "Enquiry")}</h3>
              <div className="mini-row">
                <button className="btn small ghost" onClick={() => {
                  const urls = extractImageUrlsFromRow(selected);
                  if (urls.length) onOpenImages("Enquiry Attachments", urls, 0);
                }}>Images</button>
                <button className="btn small primary" disabled={saving} onClick={() => saveResponse("resolved")}>Save + Resolve</button>
                <button className="btn small ghost" disabled={saving} onClick={() => saveResponse("spam")}>Mark Spam</button>
              </div>
            </div>
            <div className="small mt-8">
              From: <b>{displayText(selected.user_name || selected.userName)}</b> ({displayText(selected.email)}) • {displayText(selected.phone)}
            </div>
            <div className="small mt-6">
              Submitted: {displayText(selected.submitted_at || selected.submittedAt || "")}
            </div>
            <div className="field mt-12">
              <label>Message</label>
              <div className="readonly">{safeText(selected.message)}</div>
            </div>
            <div className="field">
              <label>Response</label>
              <textarea className="input" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your response..." />
            </div>
            <div className="small">
              Responded at: {displayText(selected.responded_at || selected.respondedAt || "", "not yet")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function detectDashboardScope() {
  try {
    if (typeof window === "undefined") return "travel";
    const forcedScope = safeText(window.__EV_DASHBOARD_SCOPE || "").toLowerCase();
    if (forcedScope === "admin" || forcedScope === "all") return "admin";
    if (forcedScope === "food") return "food";
    if (forcedScope === "support" || forcedScope === "customer_support" || forcedScope === "customer-support") return "support";
    if (forcedScope === "travel") return "travel";
    const q = new URLSearchParams(String(window.location.search || "").replace(/^\?/, ""));
    const qp = safeText(q.get("dashboard") || "").toLowerCase();
    if (qp === "admin" || qp === "all") return "admin";
    if (qp === "food") return "food";
    if (qp === "support" || qp === "customer_support" || qp === "customer-support") return "support";
    const parts = String(window.location.pathname || "").split("/").map((x) => safeText(x).toLowerCase()).filter(Boolean);
    const tail = parts[parts.length - 1] || "";
    if (tail === "admin" || tail === "all") return "admin";
    if (tail === "food") return "food";
    if (tail === "support") return "support";
  } catch {}
  return "travel";
}

export async function http(path, init) {
  const dashboard = detectDashboardScope();
  const r = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-EV-Dashboard": dashboard, ...(init?.headers || {}) },
    ...init
  });
  let payload = null;
  try {
    payload = await r.json();
  } catch {
    payload = null;
  }
  if (!r.ok) {
    const message = payload?.message || payload?.error || `HTTP_${r.status}`;
    const err = new Error(message);
    err.status = r.status;
    err.payload = payload;
    err.path = path;
    throw err;
  }
  return payload;
}

function adminApiCandidates(path) {
  const out = [path];
  try {
    if (typeof window !== "undefined") {
      const host = safeText(window.location.hostname);
      const port = safeText(window.location.port);
      const proto = safeText(window.location.protocol) || "http:";
      if ((host === "localhost" || host === "127.0.0.1") && port && port !== "8082") {
        out.push(`${proto}//${host}:8082${path}`);
      }
    }
  } catch {}
  return uniqStrings(out);
}

async function adminApiJson(path, init) {
  const dashboard = detectDashboardScope();
  const candidates = adminApiCandidates(path);
  let lastErr = null;
  for (const url of candidates) {
    try {
      const headers = { "X-EV-Dashboard": dashboard, ...(init?.headers || {}) };
      const r = await fetch(url, {
        credentials: "include",
        headers,
        ...(init || {})
      });
      const text = await r.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      const contentType = String(r.headers.get("content-type") || "").toLowerCase();
      const trimmed = String(text || "").trim();
      const looksHtml = contentType.includes("text/html") || trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html");
      if (!r.ok) {
        const msg = json?.message || json?.error || `HTTP_${r.status}`;
        throw new Error(String(msg || "API_FAILED"));
      }
      if (looksHtml || !json || typeof json !== "object") {
        throw new Error("INVALID_API_RESPONSE");
      }
      return json;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("API_FAILED");
}

export async function adminApiForm(path, init) {
  const dashboard = detectDashboardScope();
  const candidates = adminApiCandidates(path);
  let lastErr = null;
  for (const url of candidates) {
    try {
      const headers = { "X-EV-Dashboard": dashboard, ...(init?.headers || {}) };
      const r = await fetch(url, {
        credentials: "include",
        headers,
        ...(init || {})
      });
      const text = await r.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      const contentType = String(r.headers.get("content-type") || "").toLowerCase();
      const trimmed = String(text || "").trim();
      const looksHtml = contentType.includes("text/html") || trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html");
      if (!r.ok) {
        const msg = json?.message || json?.error || `HTTP_${r.status}`;
        throw new Error(String(msg || "API_FAILED"));
      }
      if (looksHtml || !json || typeof json !== "object") {
        throw new Error("INVALID_API_RESPONSE");
      }
      return json;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("API_FAILED");
}

export function ImageLightbox({ title, urls, index, onClose, onPick }) {
  if (!urls?.length) return null;
  const i = Math.max(0, Math.min(urls.length - 1, index || 0));
  const active = urls[i];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title || "Images"}</div>
          <button className="btn small" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <img className="modal-img" src={active} alt="" />
        </div>
        <div className="modal-foot">
          <div className="small">{i + 1} / {urls.length}</div>
          <div className="mini-row">
            {urls.slice(0, 16).map((u, idx) => (
              <img
                key={u}
                className={`mini ${idx === i ? "active" : ""}`}
                src={u}
                alt=""
                onClick={() => onPick(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function statCard(label, count, tag) {
  return (
    <div className="stat" key={label}>
      <h4>{label}</h4>
      <div className="num">{count}</div>
      <div className={`badge ${tag === "live" ? "green" : "warn"}`}>{tag === "live" ? "Live" : "Catalog"}</div>
    </div>
  );
}

export function LoginView({ onSuccess, dashboard = "travel" }) {
  const dashboardLabel = dashboard === "admin"
    ? "Admin Dashboard"
    : dashboard === "food"
      ? "FOOD | MART | DUTY"
      : dashboard === "support"
        ? "Customer Support Dashboard"
        : dashboard === "mart_vendor"
          ? "Mart Vendor Portal"
          : "Travel Dashboard";
  const [dashboardUsername, setDashboardUsername] = useState("");
  const [dashboardPassword, setDashboardPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowsSecretKeyFallback = dashboard !== "food";

  const unlockDashboard = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        username: dashboardUsername,
        password: dashboardPassword,
        dashboard
      };
      if (allowsSecretKeyFallback) payload.adminKey = dashboardPassword;
      await http("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      onSuccess();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap unified-dashboard-window">
      <div className="login-card window-panel">
        <h1 className="page-title"><FaShieldAlt /> {dashboardLabel}</h1>
        <div className="small">
          {dashboard === "food"
            ? "Login with your FOOD | MART | DUTY username and password."
            : "Secure username and password access for this dashboard."}
        </div>
        <div className="field">
          <label>{dashboardLabel} Username</label>
          <input
            className="input"
            value={dashboardUsername}
            onChange={(e) => setDashboardUsername(safeText(e.target.value).toLowerCase())}
            placeholder="Enter dashboard username"
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>{dashboardLabel} Password</label>
          <input
            className="input"
            type="password"
            value={dashboardPassword}
            onChange={(e) => setDashboardPassword(e.target.value)}
            placeholder="Enter dashboard password"
            autoComplete="current-password"
          />
        </div>
        {error ? <div className="warn">{error}</div> : null}
        <button className="btn primary" disabled={busy || !dashboardUsername || !dashboardPassword} onClick={unlockDashboard}>
          <FaSignInAlt /> {busy ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
}

export function DashboardView({ snapshot, tablesByName, onReload, onOpenImages, onUpsert, onPatch, showLiveQueueSection = true, showOrdersSection = true, showPricingSection = true, defaultSection = null }) {
  const dashboardScope = detectDashboardScope();
  const hasOverviewTab = dashboardScope === "travel";
  const showCustomerSupportSection = dashboardScope === "admin" || dashboardScope === "support";
  const [dashTab, setDashTab] = useState("travel");
  const [ordersTab, setOrdersTab] = useState("bookings");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [dashPage, setDashPage] = useState(1);
  // Mirrors the Customer Support tab's own condition in the tab strip. Kept as
  // one value so the default section cannot select a tab that is not rendered —
  // travel hides this tab, and defaulting to it left the strip with nothing
  // selected and the panel blank.
  const ordersTabVisible = showOrdersSection && dashboardScope !== "travel";
  // First tab that actually exists. Travel used to land on the analytics
  // overview, then on Recent Highlights; both are gone, so it lands on Pricing.
  const defaultDashSection = defaultSection || (
    showLiveQueueSection
      ? "live"
      : (ordersTabVisible ? "orders" : (showPricingSection ? "pricing" : "refunds"))
  );
  const [dashSection, setDashSection] = useState(defaultDashSection);
  const [queueBusyId, setQueueBusyId] = useState("");
  const [queueErr, setQueueErr] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState({ id: "", rect: null, dropUp: false });
  const closeActionMenu = () => setOpenActionMenu({ id: "", rect: null, dropUp: false });
  useEffect(() => {
    if (!openActionMenu.id) return;
    const onDocClick = (e) => {
      const target = e.target;
      if (target && target.closest && (target.closest(".action-menu-wrap") || target.closest(".action-menu-floating"))) return;
      closeActionMenu();
    };
    const onKey = (e) => { if (e.key === "Escape") closeActionMenu(); };
    const onScroll = () => closeActionMenu();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [openActionMenu.id]);
  const toggleActionMenu = (rowId, evt) => {
    if (openActionMenu.id === rowId) { closeActionMenu(); return; }
    const trigger = evt && evt.currentTarget;
    if (!trigger || typeof trigger.getBoundingClientRect !== "function") {
      setOpenActionMenu({ id: rowId, rect: null, dropUp: false });
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const menuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < menuHeight && rect.top > menuHeight;
    setOpenActionMenu({
      id: rowId,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      dropUp
    });
  };
  const [relatedItemModal, setRelatedItemModal] = useState({
    open: false,
    title: "",
    itemId: "",
    name: "",
    category: "",
    image: "",
    fields: []
  });

  useEffect(() => {
    setDashPage(1);
  }, [dashTab, ordersTab, bookingSearch, bookingStatus, dashSection]);

  const enquiriesTable = tablesByName.get(TABLES.QUERIES);
  const bookingsRows = (tablesByName.get(TABLES.BOOKINGS)?.rows || []);
  const cabBookingRows = (tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || []);
  const bikeBookingRows = (tablesByName.get(TABLES.BIKE_BOOKINGS)?.rows || []);
  const foodOrderRows = (tablesByName.get(TABLES.FOOD_ORDERS)?.rows || []);
  const martOrderRows = (tablesByName.get("ev_mart_orders")?.rows || tablesByName.get("martOrders")?.rows || []);
  const toursRows = (tablesByName.get(TABLES.TOURS)?.rows || []);
  const restaurantsRows = (tablesByName.get(TABLES.RESTAURANTS)?.rows || []);
  const martsRows = (tablesByName.get(TABLES.MARTS)?.rows || []);
  const productsRows = (tablesByName.get(TABLES.PRODUCTS)?.rows || []);
  const hotelsCatalogRows = (tablesByName.get(TABLES.HOTELS)?.rows || []);
  const hotelsRows = hotelsCatalogRows.filter((r) => !isLikelyCottage(r));
  const cottagesRows = hotelsCatalogRows.filter((r) => isLikelyCottage(r));
  const bikeRentalsRows = (tablesByName.get(TABLES.BIKE_RENTALS)?.rows || []);
  const toursCatalogRows = (tablesByName.get(TABLES.TOURS)?.rows || []);
  const busesCatalogRows = (tablesByName.get(TABLES.BUSES)?.rows || []);
  const cabRatesRows = (tablesByName.get(TABLES.CAB_PROVIDERS)?.rows || []);
  const busBookingRows = (tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || []);
  const deliveryRows = (tablesByName.get(TABLES.DELIVERY_TRACKING)?.rows || []);
  const refundsRows = (tablesByName.get(TABLES.REFUNDS)?.rows || []);
  const cabRatesById = useMemo(() => new Map((cabRatesRows || []).map((r) => [safeText(r?.id), r])), [cabRatesRows]);
  const userProfileRows = (
    tablesByName.get(TABLES.USER_PROFILES)?.rows ||
    tablesByName.get("userProfiles")?.rows ||
    tablesByName.get("ev_user_profiles")?.rows ||
    []
  );
  const driversRows = (
    tablesByName.get("drivers")?.rows ||
    tablesByName.get("ev_drivers")?.rows ||
    []
  );
  const driverVehicleRows = (
    tablesByName.get("driverVehicles")?.rows ||
    tablesByName.get("ev_driver_vehicles")?.rows ||
    []
  );
  const driverAvailabilityRows = (
    tablesByName.get("driverAvailability")?.rows ||
    tablesByName.get("ev_driver_availability")?.rows ||
    []
  );
  const driverBidRows = (
    tablesByName.get("driverBids")?.rows ||
    tablesByName.get("ev_cab_bids")?.rows ||
    []
  );
  const rideAssignmentRows = (
    tablesByName.get("rideAssignments")?.rows ||
    tablesByName.get("ev_ride_assignments")?.rows ||
    []
  );
  const liveTabsByScope = {
    travel: ["travel"],
    food: ["food_queue", "vendors", "marts", "products"],
    support: ["bookings", "food", "cab", "bus", "delivery", "enquiries", "refunds"]
  };
  const allowedLiveTabs = liveTabsByScope[dashboardScope] || liveTabsByScope.travel;

  useEffect(() => {
    if (!allowedLiveTabs.includes(dashTab)) {
      setDashTab(allowedLiveTabs[0] || "bookings");
    }
  }, [dashboardScope, dashTab]);

  useEffect(() => {
    const nextDefault = defaultSection || (
      showLiveQueueSection
        ? "live"
        : (ordersTabVisible ? "orders" : (showPricingSection ? "pricing" : "refunds"))
    );
    // Neither section exists for any scope now. A browser still holding one in
    // state would otherwise render a tab strip with nothing selected.
    if (dashSection === "overview" || dashSection === "recent_highlights") {
      setDashSection(nextDefault);
      return;
    }
    if (dashSection === "live" && !showLiveQueueSection) {
      setDashSection(nextDefault);
      return;
    }
    if (dashSection === "orders" && !ordersTabVisible) {
      setDashSection(nextDefault);
      return;
    }
    if (dashSection === "pricing" && !showPricingSection) {
      setDashSection(nextDefault);
      return;
    }
    if (!dashSection) setDashSection(nextDefault);
  }, [defaultSection, dashSection, showLiveQueueSection, ordersTabVisible, showPricingSection]);

  const filteredBookings = useMemo(() => {
    const q = safeText(bookingSearch).trim().toLowerCase();
    const status = safeText(bookingStatus).trim().toLowerCase();
    const rows = Array.isArray(bookingsRows) ? bookingsRows : [];
    return rows
      .filter((b) => status === "all" ? true : safeText(b?.status).toLowerCase() === status)
      .filter((b) => q ? JSON.stringify(b).toLowerCase().includes(q) : true);
  }, [bookingsRows, bookingSearch, bookingStatus]);

  const restaurantsById = useMemo(() => {
    const map = new Map();
    (restaurantsRows || []).forEach((r) => {
      const id = safeText(r?.id);
      if (!id) return;
      map.set(id, safeText(r?.name || ""));
    });
    return map;
  }, [restaurantsRows]);

  const martsById = useMemo(() => {
    const map = new Map();
    (martsRows || []).forEach((r) => {
      const id = safeText(r?.id);
      if (!id) return;
      map.set(id, safeText(r?.name || ""));
    });
    return map;
  }, [martsRows]);

  const statCards = dashboardScope === "food"
    ? [
        { label: "Food Orders", count: foodOrderRows.length || 0, tag: "live" },
        { label: "Mart Orders", count: martOrderRows.length || 0, tag: "live" },
        { label: "Food Vendors", count: restaurantsRows.length || 0, tag: "live" },
        { label: "Marts", count: martsRows.length || 0, tag: "live" },
        { label: "Mart Products", count: productsRows.length || 0, tag: "live" }
      ]
    : (dashboardScope === "support"
        ? [
            { label: "Hotel Bookings", count: bookingsRows.length || 0, tag: "live" },
            { label: "Cab Bookings", count: cabBookingRows.length || 0, tag: "live" },
            { label: "Bus Bookings", count: busBookingRows.length || 0, tag: "live" },
            { label: "Food Orders", count: foodOrderRows.length || 0, tag: "live" },
            { label: "Delivery", count: deliveryRows.length || 0, tag: "live" },
            { label: "Enquiries", count: (tablesByName.get(TABLES.QUERIES)?.rowCount) || 0, tag: "live" },
            { label: "Refunds", count: refundsRows.length || 0, tag: "live" }
          ]
        : [
            {
              label: "Tour Bookings",
              count: (bookingsRows || []).filter((r) => safeText(r?.type).toLowerCase() === "tour").length || 0,
              tag: "live"
            },
            {
              label: "Hotel Bookings",
              count: (bookingsRows || []).filter((r) => {
                if (safeText(r?.type).toLowerCase() !== "hotel") return false;
                const itemId = safeText(r?.item_id || r?.itemId);
                const catalog = (hotelsCatalogRows || []).find((h) => safeText(h?.id) === itemId);
                const cottageById = itemId.toLowerCase().startsWith("cottage_");
                const isCottage = catalog ? isLikelyCottage(catalog) : cottageById;
                return !isCottage;
              }).length || 0,
              tag: "live"
            },
            {
              label: "Cottage Bookings",
              count: (bookingsRows || []).filter((r) => {
                if (safeText(r?.type).toLowerCase() !== "hotel") return false;
                const itemId = safeText(r?.item_id || r?.itemId);
                const catalog = (hotelsCatalogRows || []).find((h) => safeText(h?.id) === itemId);
                const cottageById = itemId.toLowerCase().startsWith("cottage_");
                return catalog ? isLikelyCottage(catalog) : cottageById;
              }).length || 0,
              tag: "live"
            },
            { label: "Cab Bookings", count: (tablesByName.get(TABLES.CAB_BOOKINGS)?.rowCount) || 0, tag: "live" },
            { label: "Bus Bookings", count: (tablesByName.get(TABLES.BUS_BOOKINGS)?.rowCount) || 0, tag: "live" },
            { label: "Bike Bookings", count: (tablesByName.get(TABLES.BIKE_BOOKINGS)?.rowCount) || 0, tag: "live" }
          ]);

  const travelQueueRows = useMemo(() => {
    const hotelTourRows = (bookingsRows || []).map((r) => ({
      queue_type: safeText(r?.type || "travel").toLowerCase() === "tour" ? "tour_booking" : "stay_booking",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      item_id: safeText(r?.item_id || r?.itemId),
      when: safeText(r?.tour_date || r?.tourDate || r?.check_in || r?.checkIn || r?.booking_date || r?.bookingDate),
      created_at: safeText(r?.booking_date || r?.created_at || r?.createdAt),
      amount: safeText(r?.paid_amount || r?.total_price || r?.totalPrice || ""),
      source_type: safeText(r?.type || ""),
      source_table: TABLES.BOOKINGS
    }));
    const cabRows = (cabBookingRows || []).map((r) => ({
      queue_type: "cab_booking",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      item_id: safeText(r?.rate_id || r?.rateId || ""),
      when: safeText(r?.datetime),
      created_at: safeText(r?.created_at || r?.createdAt),
      amount: resolveCabBookingFare(r, cabRatesById),
      source_table: TABLES.CAB_BOOKINGS
    }));
    const busRows = (busBookingRows || []).map((r) => ({
      queue_type: "bus_booking",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      item_id: safeText(r?.bus_id || r?.busId || ""),
      when: safeText(r?.travel_date || r?.travelDate),
      created_at: safeText(r?.created_at || r?.createdAt),
      amount: safeText(r?.total_fare || r?.totalFare || ""),
      source_table: TABLES.BUS_BOOKINGS
    }));
    const bikeRows = (bikeBookingRows || []).map((r) => ({
      queue_type: "bike_booking",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      item_id: safeText(r?.vehicle_id || r?.vehicleId || r?.bike_rental_id || r?.bikeRentalId),
      when: safeText(r?.pickup_datetime || r?.start_datetime || r?.startDateTime || r?.created_at || r?.createdAt),
      created_at: safeText(r?.created_at || r?.createdAt),
      amount: parseBikePricingAmount(r?.pricing) || safeText(r?.total_fare || r?.totalFare || ""),
      source_type: "bike",
      source_table: TABLES.BIKE_BOOKINGS
    }));
    return [...hotelTourRows, ...cabRows, ...busRows, ...bikeRows]
      .sort((a, b) => new Date(b.created_at || b.when || 0).getTime() - new Date(a.created_at || a.when || 0).getTime());
  }, [bookingsRows, cabBookingRows, busBookingRows, bikeBookingRows, cabRatesById]);

  const summarizeOrderItems = (raw) => {
    const list = Array.isArray(raw)
      ? raw
      : (typeof raw === "string"
          ? (() => {
              const parsed = safeJsonParse(raw);
              return Array.isArray(parsed) ? parsed : [];
            })()
          : []);
    if (!list.length) return "";
    return list
      .map((item) => {
        const name = safeText(item?.name || item?.title || item?.item_name || item?.itemName || item?.menu_item_name || item?.menuItemName || item?.product_name || item?.productName);
        const qtyRaw = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
        return name ? `${name} x${qty}` : "";
      })
      .filter(Boolean)
      .join(", ");
  };

  const foodMartQueueRows = useMemo(() => {
    const foodRows = (foodOrderRows || []).map((r) => ({
      ...(r || {}),
      queue_type: "food_order",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      partner: safeText(
        r?.restaurant_name ||
        r?.restaurantName ||
        restaurantsById.get(safeText(r?.restaurant_id || r?.restaurantId)) ||
        ""
      ),
      items_text: summarizeOrderItems(r?.items),
      when: safeText(r?.order_time || r?.orderTime),
      created_at: safeText(r?.created_at || r?.createdAt || r?.order_time || r?.orderTime),
      amount: safeText(r?.pricing?.totalAmount || r?.pricing?.total_amount || r?.total_amount || r?.totalAmount || ""),
      source_table: TABLES.FOOD_ORDERS
    }));
    const martRows = (martOrderRows || []).map((r) => ({
      ...(r || {}),
      queue_type: "mart_order",
      id: safeText(r?.id),
      status: safeText(r?.status || "pending"),
      user_name: safeText(r?.user_name || r?.userName || r?.name),
      phone: safeText(r?.phone),
      email: safeText(r?.email),
      partner: safeText(
        r?.store_name ||
        r?.storeName ||
        r?.mart_name ||
        r?.martName ||
        martsById.get(safeText(r?.mart_partner_id || r?.martPartnerId || r?.mart_id || r?.martId)) ||
        ""
      ),
      items_text: summarizeOrderItems(r?.items || r?.cart || r?.products),
      when: safeText(r?.order_time || r?.orderTime),
      created_at: safeText(r?.created_at || r?.createdAt || r?.order_time || r?.orderTime),
      amount: safeText(r?.total_amount || r?.totalAmount || r?.pricing?.totalAmount || r?.pricing?.total_amount || ""),
      source_table: "ev_mart_orders"
    }));
    return [...foodRows, ...martRows]
      .sort((a, b) => new Date(b.created_at || b.when || 0).getTime() - new Date(a.created_at || a.when || 0).getTime());
  }, [foodOrderRows, martOrderRows, restaurantsById, martsById]);

  const toursById = useMemo(() => new Map((toursCatalogRows || []).map((r) => [safeText(r?.id), r])), [toursCatalogRows]);
  const hotelsById = useMemo(() => new Map((hotelsCatalogRows || []).map((r) => [safeText(r?.id), r])), [hotelsCatalogRows]);
  const bikeRentalsById = useMemo(() => new Map((bikeRentalsRows || []).map((r) => [safeText(r?.id), r])), [bikeRentalsRows]);
  const busesById = useMemo(() => new Map((busesCatalogRows || []).map((r) => [safeText(r?.id), r])), [busesCatalogRows]);
  const userProfilesByPhone = useMemo(() => {
    const map = new Map();
    (userProfileRows || []).forEach((r) => {
      const key = normalizePhone(r?.phone);
      if (!key || map.has(key)) return;
      map.set(key, r);
    });
    return map;
  }, [userProfileRows]);
  const userProfilesByEmail = useMemo(() => {
    const map = new Map();
    (userProfileRows || []).forEach((r) => {
      const key = normalizeEmail(r?.email);
      if (!key || map.has(key)) return;
      map.set(key, r);
    });
    return map;
  }, [userProfileRows]);
  const driversById = useMemo(() => new Map((driversRows || []).map((r) => [safeText(r?.id), r])), [driversRows]);
  const driverVehiclesByDriverId = useMemo(() => {
    const map = new Map();
    (driverVehicleRows || []).forEach((r) => {
      const key = safeText(r?.driver_id || r?.driverId);
      if (!key || map.has(key)) return;
      map.set(key, r);
    });
    return map;
  }, [driverVehicleRows]);
  const driverAvailabilityByDriverId = useMemo(() => {
    const map = new Map();
    (driverAvailabilityRows || []).forEach((r) => {
      const key = safeText(r?.driver_id || r?.driverId);
      if (!key || map.has(key)) return;
      map.set(key, r);
    });
    return map;
  }, [driverAvailabilityRows]);
  const driverBidsById = useMemo(() => new Map((driverBidRows || []).map((r) => [safeText(r?.id), r])), [driverBidRows]);
  const rideBidsByRideId = useMemo(() => {
    const map = new Map();
    (driverBidRows || []).forEach((r) => {
      const rideId = safeText(r?.ride_request_id || r?.rideRequestId);
      if (!rideId) return;
      const list = map.get(rideId) || [];
      list.push(r);
      map.set(rideId, list);
    });
    map.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => {
        const at = new Date(a?.created_at || a?.createdAt || 0).getTime();
        const bt = new Date(b?.created_at || b?.createdAt || 0).getTime();
        return bt - at;
      });
      map.set(key, sorted);
    });
    return map;
  }, [driverBidRows]);
  const rideAssignmentsByRideId = useMemo(() => {
    const map = new Map();
    (rideAssignmentRows || []).forEach((r) => {
      const rideId = safeText(r?.ride_request_id || r?.rideRequestId);
      if (!rideId) return;
      const existing = map.get(rideId);
      if (!existing) {
        map.set(rideId, r);
        return;
      }
      const exTs = new Date(existing?.updated_at || existing?.updatedAt || existing?.assigned_at || existing?.assignedAt || 0).getTime();
      const nxTs = new Date(r?.updated_at || r?.updatedAt || r?.assigned_at || r?.assignedAt || 0).getTime();
      if (nxTs >= exTs) map.set(rideId, r);
    });
    return map;
  }, [rideAssignmentRows]);

  const renderSimpleTable = (rows, cols, emptyText, rowActions) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return <div className="small pad-10">{emptyText || "No data yet."}</div>;
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const start = (dashPage - 1) * PAGE_SIZE;
    const pageRows = list.slice(start, start + PAGE_SIZE);
    return (
      <div className="table-wrap mt-10">
        <table className="table">
          <thead>
            <tr>
              {cols.map((c) => <th key={c.key}>{safeText(c?.label || c.key)}</th>)}
              {typeof rowActions === "function" ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, idx) => (
              <tr key={safeText(r?.id || idx)}>
                {cols.map((c) => {
                  const val = c.value(r);
                  if (c.kind === "statusAction") {
                    const bookingId = safeText(r?.id);
                    const busy = queueBusyId === bookingId;
                    const status = safeText(r?.status || "pending").toLowerCase();
                    const statusSelectClass = (!status || status === "pending" || status === "new" || status === "open" || status === "unread")
                      ? "status-select-pending"
                      : (status.includes("refund") || status === "cancelled")
                        ? "status-select-refund"
                        : "status-select-confirmed";
                    return (
                      <td key={c.key} onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`select status-select ${statusSelectClass}`}
                          value={safeText(r?.status || "pending")}
                          disabled={busy}
                          onChange={(e) => updateLiveQueueStatus(r, e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="cancelled">cancelled</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                    );
                  }
                  if (c.kind === "relatedItemLink") {
                    const label = safeText(val);
                    const qType = safeText(r?.queue_type).toLowerCase();
                    const hasCheckNow = Boolean(label) || (qType === "cab_booking" && safeText(r?.id));
                    return (
                      <td key={c.key} onClick={(e) => e.stopPropagation()}>
                        {hasCheckNow ? (
                          <button className="btn small ghost" onClick={() => openRelatedItemModal(r)}>
                            Check now
                          </button>
                        ) : (
                          <span className="small">—</span>
                        )}
                      </td>
                    );
                  }
                  if (c.kind === "img") {
                    const urls = Array.isArray(val) ? val : (val ? [val] : []);
                    return (
                      <td key={c.key} className="thumb-cell">
                        {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages(c.key, urls, 0)} /> : null}
                      </td>
                    );
                  }
                  if (c.kind === "orderTypeBadge") {
                    const raw = safeText(val).toLowerCase();
                    const isMart = raw === "mart_order" || raw === "mart";
                    const label = isMart ? "Mart" : raw === "food_order" ? "Food" : (safeText(val) || "—");
                    return (
                      <td key={c.key} className="cell-type">
                        <span className={`order-type-badge ${isMart ? "mart" : "food"}`}>{label}</span>
                      </td>
                    );
                  }
                  if (c.kind === "orderTime") {
                    const text = safeText(val);
                    let primary = text;
                    let secondary = "";
                    const dt = text ? new Date(text) : null;
                    if (dt && !Number.isNaN(dt.getTime())) {
                      const dayOpts = { day: "2-digit", month: "short", year: "numeric" };
                      const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: true };
                      try {
                        primary = dt.toLocaleDateString(undefined, dayOpts);
                        secondary = dt.toLocaleTimeString(undefined, timeOpts);
                      } catch {}
                    }
                    return (
                      <td key={c.key} className="cell-time">
                        <div className="cell-time-primary">{primary || "—"}</div>
                        {secondary ? <div className="cell-time-secondary">{secondary}</div> : null}
                      </td>
                    );
                  }
                  if (c.kind === "amount") {
                    const text = safeText(val);
                    const num = text === "" ? null : Number(text);
                    const display = num != null && !Number.isNaN(num) ? `₹${num.toLocaleString()}` : (text || "—");
                    return <td key={c.key} className="cell-amount">{display}</td>;
                  }
                  if (c.kind === "customerCell") {
                    const rowObj = val || {};
                    const name = safeText(rowObj?.user_name) || safeText(rowObj?.name) || "Guest";
                    const phone = safeText(rowObj?.phone);
                    const initials = (name.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "?";
                    const colors = ["#2f9d72", "#0ea5e9", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#14b8a6"];
                    const tint = colors[(name.charCodeAt(0) || 0) % colors.length];
                    return (
                      <td key={c.key} className="cell-customer">
                        <div className="customer-row">
                          <div className="customer-avatar" style={{ background: `linear-gradient(135deg, ${tint} 0%, ${tint}cc 100%)` }}>{initials}</div>
                          <div className="customer-meta">
                            <div className="customer-name">{name}</div>
                            {phone ? <div className="customer-phone"><FaPhoneAlt /> {phone}</div> : null}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  if (c.kind === "partnerCell") {
                    const text = safeText(val);
                    if (!text) return <td key={c.key} className="cell-partner-empty">—</td>;
                    return <td key={c.key} className="cell-partner">{text}</td>;
                  }
                  if (c.kind === "itemsCell") {
                    const text = safeText(val);
                    if (!text) return <td key={c.key} className="cell-items"><span className="muted">—</span></td>;
                    const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
                    const first = parts[0] || text;
                    const rest = parts.length - 1;
                    return (
                      <td key={c.key} className="cell-items" title={text}>
                        <div className="items-row">
                          <FaShoppingBasket className="items-icon" />
                          <div className="items-text">
                            <div className="items-first">{first}</div>
                            {rest > 0 ? <div className="items-more">+{rest} more</div> : null}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  return <td key={c.key}>{displayText(val).slice(0, 120)}</td>;
                })}
                {typeof rowActions === "function" ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    {rowActions(r)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={dashPage} totalPages={totalPages} onChange={setDashPage} />
      </div>
    );
  };

  const updateLiveQueueStatus = async (row, nextStatus) => {
    const rowId = safeText(row?.id);
    if (!rowId) return;
    const targetTable = safeText(row?.source_table) || TABLES.BOOKINGS;
    const sourceRows =
      targetTable === TABLES.CAB_BOOKINGS ? cabBookingRows
      : targetTable === TABLES.BUS_BOOKINGS ? busBookingRows
      : targetTable === TABLES.BIKE_BOOKINGS ? bikeBookingRows
      : targetTable === TABLES.FOOD_ORDERS ? foodOrderRows
      : targetTable === "ev_mart_orders" ? martOrderRows
      : bookingsRows;
    const fullRow = (sourceRows || []).find((x) => safeText(x?.id) === rowId) || { id: rowId };
    setQueueBusyId(rowId);
    setQueueErr("");
    try {
      // Advancing an order writes its status. The old call spread the whole
      // snapshot row back over the record, so moving an order along also
      // rewrote its address, items and totals from a copy that may be minutes
      // old - quietly undoing anything changed since the last reload.
      if (onPatch) {
        await onPatch(targetTable, rowId, { status: nextStatus });
      } else {
        await onUpsert(targetTable, [{ ...fullRow, status: nextStatus }]);
      }
      await onReload();
    } catch (e) {
      setQueueErr(String(e?.message || e));
    } finally {
      setQueueBusyId("");
    }
  };

  const openInvoicePdf = (row, download = false) => {
    try {
      const transactionId = safeText(row?.id);
      if (!transactionId) return;
      const sourceTable = safeText(row?.source_table || TABLES.BOOKINGS);
      const dbTableBySource = {
        [TABLES.BOOKINGS]: "ev_bookings",
        [TABLES.CAB_BOOKINGS]: "ev_cab_bookings",
        [TABLES.BUS_BOOKINGS]: "ev_bus_bookings",
        [TABLES.BIKE_BOOKINGS]: "ev_rental_bookings",
        [TABLES.FOOD_ORDERS]: "ev_food_orders",
        ev_mart_orders: "ev_mart_orders"
      };
      const table = safeText(dbTableBySource[sourceTable] || sourceTable || "ev_bookings");
      const endpoint =
        `/api/admin/invoices/transaction/${encodeURIComponent(table)}/${encodeURIComponent(transactionId)}/pdf` +
        (download ? "?download=true" : "");
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(endpoint, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Keep dashboard interactive even if invoice link generation fails.
    }
  };

  const openRelatedItemModal = (row) => {
    const rowItemId = safeText(row?.item_id);
    const bookingId = safeText(row?.id || "");
    const qType = safeText(row?.queue_type).toLowerCase();
    const srcType = safeText(row?.source_type).toLowerCase();
    const sourceTable = safeText(row?.source_table);
    const sourceRows =
      sourceTable === TABLES.CAB_BOOKINGS ? cabBookingRows
      : sourceTable === TABLES.BUS_BOOKINGS ? busBookingRows
      : sourceTable === TABLES.BIKE_BOOKINGS ? bikeBookingRows
      : sourceTable === TABLES.FOOD_ORDERS ? foodOrderRows
      : sourceTable === "ev_mart_orders" ? martOrderRows
      : bookingsRows;
    const booking = (sourceRows || []).find((x) => safeText(x?.id) === bookingId) || null;
    const itemId = rowItemId || safeText(booking?.item_id || booking?.itemId || booking?.rate_id || booking?.rateId);
    const bookingPhone = safeText(booking?.phone || row?.phone);
    const bookingEmail = safeText(booking?.email || row?.email);
    const customerProfile = userProfilesByPhone.get(normalizePhone(bookingPhone))
      || userProfilesByEmail.get(normalizeEmail(bookingEmail))
      || null;

    const selectedBidId = safeText(booking?.selected_bid_id || booking?.selectedBidId);
    const assignedDriverIdFromBooking = safeText(booking?.assigned_driver_id || booking?.assignedDriverId);
    const rideAssignment = rideAssignmentsByRideId.get(bookingId) || null;
    const selectedBid = selectedBidId ? (driverBidsById.get(selectedBidId) || null) : null;
    const allRideBids = rideBidsByRideId.get(bookingId) || [];
    const assignedDriverId = assignedDriverIdFromBooking
      || safeText(rideAssignment?.driver_id || rideAssignment?.driverId)
      || safeText(selectedBid?.driver_id || selectedBid?.driverId);
    const assignedDriver = assignedDriverId ? (driversById.get(assignedDriverId) || null) : null;
    const assignedVehicle = assignedDriverId ? (driverVehiclesByDriverId.get(assignedDriverId) || null) : null;
    const driverAvailability = assignedDriverId ? (driverAvailabilityByDriverId.get(assignedDriverId) || null) : null;
    const lowestBid = allRideBids.length
      ? [...allRideBids].sort((a, b) => Number(a?.bid_price ?? a?.bidPrice ?? Infinity) - Number(b?.bid_price ?? b?.bidPrice ?? Infinity))[0]
      : null;
    let title = "Booked Item Details";
    let item = null;

    if (qType === "cab_booking") {
      title = "Cab Booking Details";
      item = cabRatesById.get(itemId) || null;
    } else if (qType === "bike_booking") {
      title = "Bike Rental Details";
      item = bikeRentalsById.get(itemId) || null;
    } else if (qType === "bus_booking") {
      title = "Bus Route Details";
      item = busesById.get(itemId) || null;
    } else if (srcType === "tour" || qType === "tour_booking") {
      title = "Tour Package Details";
      item = toursById.get(itemId) || null;
    } else {
      title = "Hotel/Cottage Details";
      item = hotelsById.get(itemId) || null;
    }

    const name = safeText(item?.name || item?.title || item?.id || itemId);
    const category = safeText(item?.category || item?.type || srcType || qType);
    const image = item ? (extractImageUrlsFromRow(item)[0] || "") : "";
    const detailValue = (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "object") {
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      return safeText(value);
    };
    const addField = (list, seen, label, value) => {
      const v = detailValue(value);
      if (!safeText(v)) return;
      const key = safeText(label).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push([label, v]);
    };
    const fields = (() => {
      const out = [];
      const seen = new Set();

      // Booking details first so admins see exactly what rider booked.
      if (booking || bookingId) {
        addField(out, seen, "Booking ID", bookingId);
        addField(out, seen, "Booking Type", qType);
        addField(out, seen, "Rider", booking?.user_name || booking?.userName || row?.user_name || row?.userName);
        addField(out, seen, "Email", booking?.email || row?.email);
        addField(out, seen, "Phone", booking?.phone || row?.phone);
        addField(out, seen, "Status", booking?.status || row?.status);
        addField(out, seen, "Pickup", booking?.pickup_location || booking?.pickupLocation);
        addField(out, seen, "Drop", booking?.drop_location || booking?.dropLocation);
        addField(out, seen, "Date/Time", booking?.datetime || row?.when);
        addField(out, seen, "Passengers", booking?.passengers);
        addField(out, seen, "Vehicle Type", booking?.vehicle_type || booking?.vehicleType);
        addField(out, seen, "Start", booking?.pickup_datetime || booking?.start_datetime || booking?.startDateTime || row?.when);
        addField(out, seen, "End", booking?.drop_datetime || booking?.end_datetime || booking?.endDateTime);
        addField(out, seen, "Days", booking?.days);
        addField(out, seen, "Qty", booking?.qty || booking?.quantity);
        addField(out, seen, "Total Fare", resolveCabBookingFare(booking || row, cabRatesById) || parseBikePricingAmount(booking?.pricing) || booking?.total_fare || booking?.totalFare || row?.amount);
        addField(out, seen, "Estimated Fare", resolveCabBookingFare(booking || row, cabRatesById) || booking?.estimated_fare || booking?.estimatedFare);
        addField(out, seen, "Service Area ID", booking?.service_area_id || booking?.serviceAreaId);
        addField(out, seen, "Pricing", booking?.pricing);
        addField(out, seen, "Selected Bid ID", selectedBidId);
        addField(out, seen, "Assigned Driver ID", assignedDriverIdFromBooking);
        addField(out, seen, "Booked At", booking?.created_at || booking?.createdAt || row?.created_at);
      }

      if (qType === "cab_booking") {
        addField(out, seen, "Customer Profile ID", customerProfile?.id);
        addField(out, seen, "Customer Name", customerProfile?.name || customerProfile?.full_name || customerProfile?.user_name || customerProfile?.userName);
        addField(out, seen, "Customer Address", customerProfile?.address || customerProfile?.location || customerProfile?.city);
        addField(out, seen, "Customer Country", customerProfile?.country);
        addField(out, seen, "Customer Aadhaar", customerProfile?.aadhaar_url || customerProfile?.aadhaarUrl);
        addField(out, seen, "Customer Created", customerProfile?.created_at || customerProfile?.createdAt);
        addField(out, seen, "Ride Bids Count", allRideBids.length);
        addField(out, seen, "Best Bid Price", lowestBid?.bid_price ?? lowestBid?.bidPrice);
        addField(out, seen, "Best Bid Driver ID", lowestBid?.driver_id || lowestBid?.driverId);
        addField(out, seen, "Best Bid ETA (min)", lowestBid?.eta_min || lowestBid?.etaMin);
        addField(out, seen, "Selected Bid Price", selectedBid?.bid_price ?? selectedBid?.bidPrice);
        addField(out, seen, "Selected Bid ETA (min)", selectedBid?.eta_min || selectedBid?.etaMin);
        addField(out, seen, "Selected Bid Status", selectedBid?.status);
        addField(out, seen, "Ride Assignment ID", rideAssignment?.id);
        addField(out, seen, "Ride Assignment Status", rideAssignment?.status);
        addField(out, seen, "Ride Assignment Bid ID", rideAssignment?.bid_id || rideAssignment?.bidId);
        addField(out, seen, "Ride Assignment Driver ID", rideAssignment?.driver_id || rideAssignment?.driverId);
        addField(out, seen, "Ride Assigned At", rideAssignment?.assigned_at || rideAssignment?.assignedAt);
        addField(out, seen, "Driver ID", assignedDriver?.id || assignedDriverId);
        addField(out, seen, "Driver Name", assignedDriver?.name);
        addField(out, seen, "Driver Phone", assignedDriver?.phone);
        addField(out, seen, "Driver Email", assignedDriver?.email);
        addField(out, seen, "Driver Rating", assignedDriver?.rating);
        addField(out, seen, "Driver Status", assignedDriver?.status);
        addField(out, seen, "Driver Active", assignedDriver?.active);
        addField(out, seen, "Driver Vehicle Type", assignedVehicle?.vehicle_type || assignedVehicle?.vehicleType || assignedVehicle?.viechle_cat);
        addField(out, seen, "Driver Vehicle Model", assignedVehicle?.model);
        addField(out, seen, "Driver Vehicle Number", assignedVehicle?.vehicle_number || assignedVehicle?.vehicleNumber);
        addField(out, seen, "Driver Vehicle Color", assignedVehicle?.color);
        addField(out, seen, "Driver Vehicle Seats", assignedVehicle?.seats);
        addField(out, seen, "Driver Online", driverAvailability?.online);
        addField(out, seen, "Driver Latitude", driverAvailability?.lat);
        addField(out, seen, "Driver Longitude", driverAvailability?.lng);
        addField(out, seen, "Driver Last Seen", driverAvailability?.updated_at || driverAvailability?.updatedAt);
      }

      if (item) {
        addField(out, seen, "ID", item?.id);
        addField(out, seen, "Name", item?.name || item?.title);
        addField(out, seen, "Category", item?.category || item?.type || srcType || qType);
        addField(out, seen, "Bike Model", item?.bike_model || item?.bikeModel);
        addField(out, seen, "Location", item?.location || item?.from_city || item?.fromCity || item?.vendor_details?.location);
        addField(out, seen, "Destination", item?.to_city || item?.toCity);
        addField(out, seen, "Price", item?.price_per_night || item?.price || item?.fare_per_seat || item?.per_km);
        addField(out, seen, "Pricing", item?.pricing);
        addField(out, seen, "Availability", item?.availability);
        addField(out, seen, "Availability Rates", item?.availability_rates || item?.availabilityRates || item?.availability_rate || item?.availablility_rates || item?.availablaity_rate);
        addField(out, seen, "Vendor Details", item?.vendor_details || item?.vendorDetails);
        addField(out, seen, "Available", item?.available ?? item?.active ?? "");
        addField(out, seen, "Created At", item?.created_at || item?.createdAt);
        addField(out, seen, "Updated At", item?.updated_at || item?.updatedAt);

        Object.keys(item || {})
          .sort((a, b) => a.localeCompare(b))
          .forEach((k) => {
            const v = item?.[k];
            const label = titleCaseLabel(k) || k;
            addField(out, seen, label, v);
          });
      }

      return out;
    })();

    setRelatedItemModal({
      open: true,
      title,
      itemId,
      name,
      category,
      image,
      fields: fields.length ? fields : [["Item ID", itemId], ["Message", "No catalog details found for this item."]]
    });
  };

  return (
    <>
      <div className="dash-nav">
        {/* No Overview or Recent Highlights tab. Overview held the analytics
            hero — revenue trend, service mix, support counters — and Recent
            Highlights listed the last ten cab orders. Both summarised orders
            the Customer Orders table above now shows in full, filterable and
            searchable across every service rather than cab alone. */}
        {showLiveQueueSection ? <button className={`tab ${dashSection === "live" ? "active" : ""}`} onClick={() => setDashSection("live")}><FaClipboardList /> Live Queue</button> : null}
        {showOrdersSection && dashboardScope !== "travel" ? (
          <button className={`tab ${dashSection === "orders" ? "active" : ""}`} onClick={() => setDashSection("orders")}>
            <FaStore /> Customer Support
          </button>
        ) : null}
        {showPricingSection ? <button className={`tab ${dashSection === "pricing" ? "active" : ""}`} onClick={() => setDashSection("pricing")}><FaChartLine /> Pricing Controls</button> : null}
        <button className={`tab ${dashSection === "refunds" ? "active" : ""}`} onClick={() => setDashSection("refunds")}><FaUndoAlt /> Refunds</button>
      </div>

      {showPricingSection && dashSection === "pricing" ? (
        <PricingControlsWorkspace
          snapshot={snapshot}
          onReload={onReload}
          onUpsert={onUpsert}
          TABLES={TABLES}
          isLikelyCottage={isLikelyCottage}
          safeJsonParse={safeJsonParse}
        />
      ) : null}

      {showLiveQueueSection && dashSection === "live" ? (
      <>
        {hasOverviewTab ? (
          <div className="card">
            <h2 className="mt-0">Welcome back</h2>
            <div className="small">Everything below is loaded directly from Supabase tables and fields.</div>
            <div className="stat-grid mt-12">
              {statCards.map((x) => statCard(x.label, x.count, x.tag))}
            </div>
          </div>
        ) : null}
        <div className="card">
          {queueErr ? <div className="warn mb-10">{queueErr}</div> : null}
          <div className="row mb-8">
            <h3 className="m-0">Live Queue</h3>
            {dashboardScope === "food" ? null : <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>}
          </div>
          <div className="tabs mt-8">
            {allowedLiveTabs.includes("travel") ? <button className={`tab ${dashTab === "travel" ? "active" : ""}`} onClick={() => setDashTab("travel")}><FaClipboardList />Travel Bookings</button> : null}
            {allowedLiveTabs.includes("bookings") ? <button className={`tab ${dashTab === "bookings" ? "active" : ""}`} onClick={() => setDashTab("bookings")}><FaClipboardList />Travel Bookings</button> : null}
            {allowedLiveTabs.includes("food_queue") ? <button className={`tab ${dashTab === "food_queue" ? "active" : ""}`} onClick={() => setDashTab("food_queue")}><FaStore /> Food/Mart Queue</button> : null}
            {allowedLiveTabs.includes("food") ? <button className={`tab ${dashTab === "food" ? "active" : ""}`} onClick={() => setDashTab("food")}><FaStore /> Food Orders</button> : null}
            {allowedLiveTabs.includes("cab") ? <button className={`tab ${dashTab === "cab" ? "active" : ""}`} onClick={() => setDashTab("cab")}><FaCar /> Cab Bookings</button> : null}
            {allowedLiveTabs.includes("bus") ? <button className={`tab ${dashTab === "bus" ? "active" : ""}`} onClick={() => setDashTab("bus")}><FaBus /> Bus Bookings</button> : null}
            {allowedLiveTabs.includes("tours") ? <button className={`tab ${dashTab === "tours" ? "active" : ""}`} onClick={() => setDashTab("tours")}><FaMapMarkerAlt /> Tours</button> : null}
            {allowedLiveTabs.includes("hotels") ? <button className={`tab ${dashTab === "hotels" ? "active" : ""}`} onClick={() => setDashTab("hotels")}><FaHotel /> Hotels</button> : null}
            {allowedLiveTabs.includes("cottages") ? <button className={`tab ${dashTab === "cottages" ? "active" : ""}`} onClick={() => setDashTab("cottages")}><FaBed /> Cottages</button> : null}
            {allowedLiveTabs.includes("bikes") ? <button className={`tab ${dashTab === "bikes" ? "active" : ""}`} onClick={() => setDashTab("bikes")}><FaMotorcycle /> Bike Rentals</button> : null}
            {allowedLiveTabs.includes("vendors") ? <button className={`tab ${dashTab === "vendors" ? "active" : ""}`} onClick={() => setDashTab("vendors")}><FaUtensils /> Food Vendors</button> : null}
            {allowedLiveTabs.includes("marts") ? <button className={`tab ${dashTab === "marts" ? "active" : ""}`} onClick={() => setDashTab("marts")}><FaStore /> Marts</button> : null}
            {allowedLiveTabs.includes("products") ? <button className={`tab ${dashTab === "products" ? "active" : ""}`} onClick={() => setDashTab("products")}><FaTable /> Mart Products</button> : null}
            {allowedLiveTabs.includes("delivery") ? <button className={`tab ${dashTab === "delivery" ? "active" : ""}`} onClick={() => setDashTab("delivery")}><FaTruck /> Delivery</button> : null}
            {allowedLiveTabs.includes("enquiries") ? <button className={`tab ${dashTab === "enquiries" ? "active" : ""}`} onClick={() => setDashTab("enquiries")}><FaEnvelopeOpenText /> Enquiries</button> : null}
            {allowedLiveTabs.includes("refunds") ? <button className={`tab ${dashTab === "refunds" ? "active" : ""}`} onClick={() => setDashTab("refunds")}><FaUndoAlt /> Refunds</button> : null}
          </div>

        {dashTab === "travel" ? (
          <>
            <div className="small mt-10">All travel bookings</div>
            {renderSimpleTable(
              travelQueueRows,
              [
                { key: "queue_type", label: "Booking Type", value: (r) => r?.queue_type },
                { key: "status", label: "Status", kind: "statusAction", value: (r) => r?.status },
                { key: "name", label: "Customer Name", value: (r) => r?.user_name },
                { key: "phone", label: "Phone", value: (r) => r?.phone },
                { key: "item_id", label: "Related Item", kind: "relatedItemLink", value: (r) => r?.item_id },
                { key: "when", label: "Date/Time", value: (r) => r?.when },
                { key: "amount", label: "Amount", value: (r) => r?.amount }
              ],
              "No travel bookings yet.",
              (row) => {
                const rowId = safeText(row?.id);
                const busy = queueBusyId === rowId;
                const status = safeText(row?.status).toLowerCase();
                const canInvoice = status === "completed";
                return (
                  <div className="flex-gap8-wrap">
                    <button
                      className={`btn small ${status === "confirmed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => updateLiveQueueStatus(row, "confirmed")}
                    >
                      Confirm
                    </button>
                    <button
                      className={`btn small ${status === "completed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => updateLiveQueueStatus(row, "completed")}
                    >
                      Complete
                    </button>
                    <button className="btn small danger" disabled={busy} onClick={() => updateLiveQueueStatus(row, "cancelled")}>Cancel</button>
                    <button className="btn small" disabled={!canInvoice} onClick={() => openInvoicePdf(row, false)}>Print PDF</button>
                    <button className="btn small" disabled={!canInvoice} onClick={() => openInvoicePdf(row, true)}>Download PDF</button>
                  </div>
                );
              }
            )}
          </>
        ) : null}

        {dashTab === "food_queue" ? (
          <>
            <div className="small mt-10">Food and mart orders queue</div>
            {renderSimpleTable(
              foodMartQueueRows,
              [
                { key: "queue_type", label: "Type", kind: "orderTypeBadge", value: (r) => r?.queue_type },
                { key: "status", label: "Status", kind: "statusAction", value: (r) => r?.status },
                { key: "customer", label: "Customer", kind: "customerCell", value: (r) => r },
                { key: "partner", label: "Partner", kind: "partnerCell", value: (r) => r?.partner },
                { key: "items_text", label: "Items", kind: "itemsCell", value: (r) => r?.items_text || "" },
                { key: "when", label: "Order Time", kind: "orderTime", value: (r) => r?.when },
                { key: "amount", label: "Amount", kind: "amount", value: (r) => r?.amount }
              ],
              "No food or mart orders yet.",
              (row) => {
                const rowId = safeText(row?.id);
                const busy = queueBusyId === rowId;
                const status = safeText(row?.status).toLowerCase();
                const canInvoice = status === "completed";
                const isOpen = openActionMenu.id === rowId;
                const runAndClose = (fn) => () => { fn(); closeActionMenu(); };
                return (
                  <div className={`action-menu-wrap ${isOpen ? "open" : ""}`}>
                    <button
                      type="button"
                      className={`action-menu-trigger ${isOpen ? "is-open" : ""}`}
                      disabled={busy}
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                      onClick={(e) => toggleActionMenu(rowId, e)}
                    >
                      <span>Actions</span>
                      <FaEllipsisV />
                    </button>
                    {isOpen ? (
                      <ActionMenuFloating
                        anchor={openActionMenu.rect}
                        dropUp={openActionMenu.dropUp}
                        status={status}
                        busy={busy}
                        canInvoice={canInvoice}
                        onConfirm={runAndClose(() => updateLiveQueueStatus(row, "confirmed"))}
                        onComplete={runAndClose(() => updateLiveQueueStatus(row, "completed"))}
                        onCancel={runAndClose(() => updateLiveQueueStatus(row, "cancelled"))}
                        onPrint={runAndClose(() => openInvoicePdf(row, false))}
                        onDownload={runAndClose(() => openInvoicePdf(row, true))}
                      />
                    ) : null}
                  </div>
                );
              }
            )}
          </>
        ) : null}

        {dashTab === "bookings" ? (
          <>
            <div className="filters mt-10">
              <div className="pos-rel">
                <FaSearch className="search-icon" />
                <input className="input input-search" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search bookings..." />
              </div>
              <select className="input" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredBookings.length} rows</div>
            </div>
            <div className="table-wrap mt-10">
              <BookingsTable
                rows={filteredBookings.slice((dashPage - 1) * PAGE_SIZE, dashPage * PAGE_SIZE)}
                onOpenRow={() => {}}
                onOpenImages={onOpenImages}
                onUpsert={onUpsert}
                onReload={onReload}
              />
              <Pagination page={dashPage} totalPages={Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))} onChange={setDashPage} />
            </div>
          </>
        ) : null}

        {dashTab === "cab" ? (
          <>
            <div className="small mt-10">Latest cab bookings</div>
            {renderSimpleTable(
              cabBookingRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "name", value: (r) => r?.user_name || r?.userName },
                { key: "phone", value: (r) => r?.phone },
                { key: "pickup", value: (r) => r?.pickup_location || r?.pickupLocation },
                { key: "drop", value: (r) => r?.drop_location || r?.dropLocation },
                { key: "datetime", value: (r) => r?.datetime },
                { key: "fare", value: (r) => resolveCabBookingFare(r, cabRatesById) }
              ],
              "No cab bookings yet. Add cab providers + book from frontend to see it here."
            )}
          </>
        ) : null}

        {dashTab === "bus" ? (
          <>
            <div className="small mt-10">Latest bus bookings</div>
            {renderSimpleTable(
              busBookingRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "name", value: (r) => r?.user_name || r?.userName },
                { key: "phone", value: (r) => r?.phone },
                { key: "from", value: (r) => r?.from_city || r?.fromCity },
                { key: "to", value: (r) => r?.to_city || r?.toCity },
                { key: "travel_date", value: (r) => r?.travel_date || r?.travelDate },
                { key: "total_fare", value: (r) => r?.total_fare ?? r?.totalFare ?? "" }
              ],
              "No bus bookings yet."
            )}
          </>
        ) : null}

        {dashTab === "tours" ? (
          <>
            <div className="small mt-10">Tours catalog</div>
            {renderSimpleTable(
              toursRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "image", kind: "img", value: (r) => r?.hero_image || (Array.isArray(r?.images) ? r.images[0] : "") },
                { key: "title", value: (r) => r?.title },
                { key: "price", value: (r) => r?.price },
                { key: "available", value: (r) => r?.available }
              ],
              "No tours yet. Add tours from Admin: Tours section."
            )}
          </>
        ) : null}

        {dashTab === "hotels" ? (
          <>
            <div className="small mt-10">Hotels catalog</div>
            {renderSimpleTable(
              hotelsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "image", kind: "img", value: (r) => r?.hero_image || (Array.isArray(r?.images) ? r.images[0] : "") },
                { key: "name", value: (r) => r?.name },
                { key: "location", value: (r) => r?.location },
                { key: "price_per_night", value: (r) => r?.price_per_night || r?.pricePerNight },
                { key: "available", value: (r) => r?.available }
              ],
              "No hotels yet."
            )}
          </>
        ) : null}

        {dashTab === "cottages" ? (
          <>
            <div className="small mt-10">Cottages catalog</div>
            {renderSimpleTable(
              cottagesRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "image", kind: "img", value: (r) => r?.hero_image || (Array.isArray(r?.images) ? r.images[0] : "") },
                { key: "name", value: (r) => r?.name },
                { key: "location", value: (r) => r?.location },
                { key: "price_per_night", value: (r) => r?.price_per_night || r?.pricePerNight },
                { key: "available", value: (r) => r?.available }
              ],
              "No cottages yet."
            )}
          </>
        ) : null}

        {dashTab === "bikes" ? (
          <>
            <div className="small mt-10">Bike rentals catalog</div>
            {renderSimpleTable(
              bikeRentalsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "name", value: (r) => r?.name },
                { key: "category", value: (r) => r?.category || r?.bike_model || r?.bikeModel },
                { key: "location", value: (r) => r?.location || r?.vendor_details?.location },
                { key: "available", value: (r) => r?.available },
                { key: "updated_at", value: (r) => r?.updated_at || r?.updatedAt }
              ],
              "No bike rentals yet."
            )}
          </>
        ) : null}

        {dashTab === "vendors" ? (
          <>
            <div className="small mt-10">Food vendors</div>
            {renderSimpleTable(
              restaurantsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "name", value: (r) => r?.name },
                { key: "location", value: (r) => r?.location },
                { key: "available", value: (r) => r?.available }
              ],
              "No food vendors yet."
            )}
          </>
        ) : null}

        {dashTab === "marts" ? (
          <>
            <div className="small mt-10">Marts</div>
            {renderSimpleTable(
              martsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "name", value: (r) => r?.name },
                { key: "location", value: (r) => r?.location },
                { key: "available", value: (r) => r?.available }
              ],
              "No marts yet."
            )}
          </>
        ) : null}

        {dashTab === "products" ? (
          <>
            <div className="small mt-10">Mart products</div>
            {renderSimpleTable(
              productsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "name", value: (r) => r?.name },
                { key: "category", value: (r) => r?.category_id || r?.categoryId },
                { key: "price", value: (r) => r?.price },
                { key: "stock", value: (r) => r?.stock },
                { key: "available", value: (r) => r?.available }
              ],
              "No mart products yet."
            )}
          </>
        ) : null}

        {dashTab === "delivery" ? (
          <>
            <div className="small mt-10">Delivery queue</div>
            {renderSimpleTable(
              deliveryRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "order_id", value: (r) => r?.order_id || r?.orderId },
                { key: "delivery_company", value: (r) => r?.delivery_company || r?.deliveryCompany },
                { key: "updated_at", value: (r) => r?.updated_at || r?.updatedAt }
              ],
              "No delivery records yet."
            )}
          </>
        ) : null}

        {dashTab === "refunds" ? (
          <>
            <div className="small mt-10">Refund queue</div>
            {renderSimpleTable(
              refundsRows,
              [
                { key: "id", value: (r) => r?.id },
                { key: "status", value: (r) => r?.status },
                { key: "order_id", value: (r) => r?.order_id || r?.orderId },
                { key: "amount", value: (r) => r?.amount || r?.refund_amount || r?.refundAmount },
                { key: "created_at", value: (r) => r?.created_at || r?.createdAt }
              ],
              "No refund requests yet."
            )}
          </>
        ) : null}

        {dashTab === "enquiries" ? (
          <div className="mt-10">
            <EnquiriesWorkspace
              table={enquiriesTable}
              onReload={onReload}
              onOpenImages={onOpenImages}
              onUpsert={onUpsert}
            />
          </div>
        ) : null}
        </div>
      </>
      ) : null}

      {showOrdersSection && dashSection === "orders" && dashboardScope !== "travel" ? (
        <div className="card">
          <div className="row mb-8">
            <h3 className="m-0">{showCustomerSupportSection ? "Customer Support" : "Orders"}</h3>
            {dashboardScope === "food" ? null : <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>}
          </div>
          {showCustomerSupportSection ? (
            <div className="mt-10">
              <EnquiriesWorkspace
                table={enquiriesTable}
                onReload={onReload}
                onOpenImages={onOpenImages}
                onUpsert={onUpsert}
              />
            </div>
          ) : (
            <>
              <div className="tabs mt-8">
                <button className={`tab ${ordersTab === "bookings" ? "active" : ""}`} onClick={() => setOrdersTab("bookings")}><FaClipboardList /> Hotel Bookings</button>
                <button className={`tab ${ordersTab === "food" ? "active" : ""}`} onClick={() => setOrdersTab("food")}><FaStore /> Food Orders</button>
                <button className={`tab ${ordersTab === "cab" ? "active" : ""}`} onClick={() => setOrdersTab("cab")}><FaCar /> Cab Bookings</button>
                <button className={`tab ${ordersTab === "bus" ? "active" : ""}`} onClick={() => setOrdersTab("bus")}><FaBus /> Bus Bookings</button>
              </div>

              {ordersTab === "bookings" ? (
                <>
                  <div className="filters mt-10">
                    <div className="pos-rel">
                      <FaSearch className="search-icon" />
                      <input className="input input-search" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search bookings..." />
                    </div>
                    <select className="input" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                      {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="badge">{filteredBookings.length} rows</div>
                  </div>
                  <div className="table-wrap mt-10">
                    <BookingsTable
                      rows={filteredBookings.slice((dashPage - 1) * PAGE_SIZE, dashPage * PAGE_SIZE)}
                      onOpenRow={() => {}}
                      onOpenImages={onOpenImages}
                      onUpsert={onUpsert}
                      onReload={onReload}
                    />
                    <Pagination page={dashPage} totalPages={Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))} onChange={setDashPage} />
                  </div>
                </>
              ) : null}

              {ordersTab === "food" ? (
                <>
                  <div className="small mt-10">Latest food orders</div>
                  {renderSimpleTable(
                    foodOrderRows,
                    [
                      { key: "id", value: (r) => r?.id },
                      { key: "status", value: (r) => r?.status },
                      { key: "name", value: (r) => r?.user_name || r?.userName },
                      { key: "phone", value: (r) => r?.phone },
                      { key: "partner", value: (r) => r?.restaurant_name || r?.restaurantName || restaurantsById.get(safeText(r?.restaurant_id || r?.restaurantId)) || "" },
                      { key: "total", value: (r) => r?.pricing?.totalAmount ?? r?.pricing?.total_amount ?? "" },
                      { key: "order_time", value: (r) => r?.order_time || r?.orderTime }
                    ],
                    "No food orders yet."
                  )}
                </>
              ) : null}

              {ordersTab === "cab" ? (
                <>
                  <div className="small mt-10">Latest cab bookings</div>
                  {renderSimpleTable(
                    cabBookingRows,
                    [
                      { key: "id", value: (r) => r?.id },
                      { key: "status", value: (r) => r?.status },
                      { key: "name", value: (r) => r?.user_name || r?.userName },
                      { key: "phone", value: (r) => r?.phone },
                      { key: "pickup", value: (r) => r?.pickup_location || r?.pickupLocation },
                      { key: "drop", value: (r) => r?.drop_location || r?.dropLocation },
                      { key: "datetime", value: (r) => r?.datetime },
                      { key: "fare", value: (r) => resolveCabBookingFare(r, cabRatesById) }
                    ],
                    "No cab bookings yet."
                  )}
                </>
              ) : null}

              {ordersTab === "bus" ? (
                <>
                  <div className="small mt-10">Latest bus bookings</div>
                  {renderSimpleTable(
                    busBookingRows,
                    [
                      { key: "id", value: (r) => r?.id },
                      { key: "status", value: (r) => r?.status },
                      { key: "name", value: (r) => r?.user_name || r?.userName },
                      { key: "phone", value: (r) => r?.phone },
                      { key: "from", value: (r) => r?.from_city || r?.fromCity },
                      { key: "to", value: (r) => r?.to_city || r?.toCity },
                      { key: "travel_date", value: (r) => r?.travel_date || r?.travelDate },
                      { key: "total_fare", value: (r) => r?.total_fare ?? r?.totalFare ?? "" }
                    ],
                    "No bus bookings yet."
                  )}
                </>
            ) : null}
            </>
          )}
      </div>
      ) : null}

      {relatedItemModal.open ? (
        <div className="modal-backdrop" onClick={() => setRelatedItemModal({ open: false, title: "", itemId: "", name: "", category: "", image: "", fields: [] })}>
          <div className="modal card maxw-900" onClick={(e) => e.stopPropagation()}>
            {relatedItemModal.image ? (
              <img
                src={relatedItemModal.image}
                alt={relatedItemModal.name || "Booked item"}
                style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginBottom: 12, border: "1px solid #d9e7df" }}
              />
            ) : null}
            <h3 className="m-0">{relatedItemModal.name || relatedItemModal.title}</h3>
            <div className="small mt-6 mb-8">{relatedItemModal.category || relatedItemModal.title}</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(relatedItemModal.fields || []).map(([field, value], idx) => (
                    <tr key={`${field}-${idx}`}>
                      <td>{field}</td>
                      <td>{displayText(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-10">
              <button className="btn small" onClick={() => setRelatedItemModal({ open: false, title: "", itemId: "", name: "", category: "", image: "", fields: [] })}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {dashSection === "refunds" ? (
        <RefundsWorkspace snapshot={snapshot} onReload={onReload} />
      ) : null}

      {dashSection === "notifications" && dashboardScope !== "travel" ? (
        <NotificationsWorkspace snapshot={snapshot} />
      ) : null}
    </>
  );
}

function normalizePhone(phone) {
  const raw = safeText(phone);
  const digits = raw.replace(/\\D+/g, "");
  return digits || raw.toLowerCase();
}

function normalizeEmail(email) {
  return safeText(email).toLowerCase();
}

function normalizeIp(ip) {
  return safeText(ip).toLowerCase();
}

function userIdFromPhone(phone) {
  const key = normalizePhone(phone);
  return `user_${key || "unknown"}`;
}

function userIdFromEmail(email) {
  const key = normalizeEmail(email);
  return `user_${key || "unknown"}`;
}

function userIdFromIp(ip) {
  const key = normalizeIp(ip);
  return `user_${key || "unknown"}`;
}

function uniqList(list) {
  const out = [];
  const seen = new Set();
  (list || []).forEach((x) => {
    const s = safeText(x);
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  return out;
}

export function CustomersWorkspace({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const profiles = useMemo(() => (byName.get(TABLES.USER_PROFILES)?.rows || []), [byName]);
  const behavior = useMemo(() => (byName.get(TABLES.USER_BEHAVIOR_PROFILES)?.rows || []), [byName]);
  const bookings = useMemo(() => (byName.get(TABLES.BOOKINGS)?.rows || []), [byName]);
  const cabBookings = useMemo(() => (byName.get(TABLES.CAB_BOOKINGS)?.rows || []), [byName]);
  const foodOrders = useMemo(() => (byName.get(TABLES.FOOD_ORDERS)?.rows || []), [byName]);
  const events = useMemo(() => (byName.get(TABLES.ANALYTICS_EVENTS)?.rows || []), [byName]);

  const [showAnonymous, setShowAnonymous] = useState(false);
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => {
    const map = new Map(); // userId -> aggregate

    const upsert = (userId, patch) => {
      const id = safeText(userId);
      if (!id) return;
      const prev = map.get(id) || { userId: id, addresses: [], sources: [] };
      const next = { ...prev, ...patch };
      next.addresses = uniqList([...(prev.addresses || []), ...(patch.addresses || [])]);
      next.sources = uniqList([...(prev.sources || []), ...(patch.sources || [])]);
      map.set(id, next);
    };

    // Base profiles
    (profiles || []).forEach((p) => {
      const userId = safeText(p?.id) || (p?.phone ? userIdFromPhone(p.phone) : "");
      upsert(userId, {
        name: safeText(p?.name),
        phone: safeText(p?.phone),
        email: safeText(p?.email),
        ipAddress: safeText(p?.ip_address || p?.ipAddress),
        browser: safeText(p?.browser),
        createdAt: safeText(p?.created_at || p?.createdAt),
        updatedAt: safeText(p?.updated_at || p?.updatedAt),
        sources: ["profiles"]
      });
    });

    // Behavior profiles (may contain saved addresses)
    (behavior || []).forEach((b) => {
      const userId = safeText(b?.user_id || b?.userId || b?.id);
      const saved = b?.location_mobility?.savedAddresses || b?.locationMobility?.savedAddresses;
      upsert(userId, {
        name: safeText(b?.name),
        phone: safeText(b?.phone),
        email: safeText(b?.email),
        addresses: Array.isArray(saved) ? saved.map((x) => safeText(x)).filter(Boolean) : [],
        sources: ["behavior"]
      });
    });

    // Orders -> addresses
    (foodOrders || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const email = safeText(o?.email);
      const userId =
        safeText(o?.user_id || o?.userId) ||
        (phone ? userIdFromPhone(phone) : "") ||
        (email ? userIdFromEmail(email) : "");
      const addr = safeText(o?.delivery_address || o?.deliveryAddress);
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        email,
        addresses: addr ? [addr] : [],
        lastOrderAt: safeText(o?.order_time || o?.orderTime),
        sources: ["food"]
      });
    });

    (cabBookings || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const userId = safeText(o?.user_id || o?.userId) || (phone ? userIdFromPhone(phone) : "");
      const pickup = safeText(o?.pickup_location || o?.pickupLocation);
      const drop = safeText(o?.drop_location || o?.dropLocation);
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        addresses: uniqList([pickup, drop]),
        lastOrderAt: safeText(o?.created_at || o?.createdAt),
        sources: ["cab"]
      });
    });

    (bookings || []).forEach((o) => {
      const phone = safeText(o?.phone);
      const email = safeText(o?.email);
      const userId = safeText(o?.user_id || o?.userId) || (phone ? userIdFromPhone(phone) : "") || (email ? userIdFromEmail(email) : "");
      upsert(userId, {
        name: safeText(o?.user_name || o?.userName),
        phone,
        email,
        sources: ["bookings"]
      });
    });

    // Events -> last seen + login status + ip/browser/page
    const lastByUser = new Map();
    const lastAuthByUser = new Map(); // user -> {type, at}
    (events || []).forEach((e) => {
      const meta = (e?.meta && typeof e.meta === "object") ? e.meta : (safeJsonParse(e?.meta) || {});
      const phone = safeText(e?.phone);
      const email = safeText(e?.email);
      const ip = safeText(meta?.ipAddress || meta?.ip || "");
      const userId =
        safeText(e?.user_id || e?.userId) ||
        (phone ? userIdFromPhone(phone) : "") ||
        (email ? userIdFromEmail(email) : "") ||
        (ip ? userIdFromIp(ip) : "");
      const at = safeText(e?.at);
      const prevAt = safeText(lastByUser.get(userId)?.at || "");
      if (!prevAt || new Date(at).getTime() >= new Date(prevAt).getTime()) {
        lastByUser.set(userId, {
          at,
          ipAddress: ip,
          browser: safeText(meta?.browser || ""),
          page: safeText(meta?.screen || meta?.path || meta?.url || "")
        });
      }
      const type = safeText(e?.type).toLowerCase();
      if (type === "auth_login" || type === "auth_logout") {
        const prev = lastAuthByUser.get(userId);
        if (!prev || new Date(at).getTime() >= new Date(prev.at).getTime()) {
          lastAuthByUser.set(userId, { type, at });
        }
      }
    });

    for (const [userId, last] of lastByUser.entries()) {
      const auth = lastAuthByUser.get(userId);
      upsert(userId, {
        lastSeenAt: last.at,
        ipAddress: last.ipAddress,
        browser: last.browser,
        lastPage: last.page,
        loggedIn: auth ? (auth.type === "auth_login") : null,
        sources: ["events"]
      });
    }

    const list = Array.from(map.values());
    const filtered = showAnonymous
      ? list
      : list.filter((u) => safeText(u.phone) || safeText(u.email) || (u.sources || []).some((s) => s !== "events"));
    filtered.sort((a, b) => new Date(b.lastSeenAt || b.updatedAt || 0).getTime() - new Date(a.lastSeenAt || a.updatedAt || 0).getTime());
    return filtered;
  }, [profiles, behavior, bookings, cabBookings, foodOrders, events, showAnonymous]);

  return (
    <div className="card">
      <div className="filters">
        <div className="small">Customers aggregated from orders + analytics + profiles</div>
        <div className="flex-1" />
        <button className={`btn small ${showAnonymous ? "primary" : "ghost"}`} onClick={() => setShowAnonymous((p) => !p)}>
          {showAnonymous ? "Showing anonymous" : "Hide anonymous"}
        </button>
      </div>

      <div className="table-wrap mt-10">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Logged In</th>
              <th>Last Seen</th>
              <th>Last Page</th>
              <th>IP</th>
              <th>Browser</th>
              <th>Addresses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={safeText(u.userId)} onClick={() => setDetail(u)}>
                <td>{displayText(u.userId).slice(0, 36)}</td>
                <td>{displayText(u.name).slice(0, 40)}</td>
                <td>{displayText(u.phone).slice(0, 20)}</td>
                <td>{displayText(u.email).slice(0, 40)}</td>
                <td>{u.loggedIn === null ? "" : (u.loggedIn ? "Yes" : "No")}</td>
                <td>{displayText(u.lastSeenAt || u.updatedAt).slice(0, 19).replace("T", " ")}</td>
                <td>{displayText(u.lastPage).slice(0, 50)}</td>
                <td>{displayText(u.ipAddress).slice(0, 32)}</td>
                <td>{displayText(u.browser).slice(0, 48)}</td>
                <td>{Array.isArray(u.addresses) ? `${u.addresses.length}` : "0"}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={10} className="small">No customers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="card mt-12">
          <div className="flex-between-gap10-center">
            <div>
              <div className="fw-800">Customer Detail</div>
              <div className="small">{safeText(detail.userId)}</div>
            </div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <div className="small mt-10">Addresses</div>
          <div className="mt-6 flex-col-gap6">
            {(detail.addresses || []).slice(0, 30).map((a) => (
              <div key={a} className="img-chip"><span>{a}</span></div>
            ))}
            {!((detail.addresses || []).length) ? <div className="small">No addresses collected yet (food delivery + cab pickup/drop populate this).</div> : null}
          </div>
          <div className="small mt-10">Raw</div>
          <textarea className="textarea json-mini mt-6" value={JSON.stringify(detail, null, 2)} readOnly />
        </div>
      ) : null}
    </div>
  );
}

/* ─── Delivery Management Workspace ─── */
export function DeliveryWorkspace({ snapshot, onReload }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const deliveryRows = useMemo(() => (byName.get(TABLES.DELIVERY_TRACKING)?.rows || []), [byName]);
  const vendorMsgRows = useMemo(() => (byName.get(TABLES.VENDOR_MESSAGES)?.rows || []), [byName]);
  const [activeTab, setActiveTab] = useState("tracking");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updateForm, setUpdateForm] = useState({ orderId: "", status: "confirmed", notes: "" });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const filteredDelivery = useMemo(() => {
    const rows = Array.isArray(deliveryRows) ? deliveryRows : [];
    if (statusFilter === "all") return rows;
    return rows.filter((r) => safeText(r?.status).toLowerCase() === statusFilter);
  }, [deliveryRows, statusFilter]);

  const handleStatusUpdate = async () => {
    if (!updateForm.orderId || !updateForm.status) return;
    setUpdating(true);
    setUpdateMsg("");
    try {
      const res = await http("/api/delivery/update-status", {
        method: "POST",
        body: JSON.stringify({
          orderId: updateForm.orderId,
          status: updateForm.status,
          notes: updateForm.notes || undefined,
          orderType: "food"
        })
      });
      setUpdateMsg("Status updated successfully!");
      setUpdateForm({ orderId: "", status: "confirmed", notes: "" });
      onReload();
    } catch (err) {
      setUpdateMsg("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3 className="mt-0"><FaTruck /> Update Order Status</h3>
        <div className="flex-gap10-wrap mt-10">
          <input className="input w-220" placeholder="Order ID" value={updateForm.orderId} onChange={(e) => setUpdateForm((p) => ({ ...p, orderId: e.target.value }))} />
          <select className="input" value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>
            {["pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input flex-1 minw-200" placeholder="Notes (optional)" value={updateForm.notes} onChange={(e) => setUpdateForm((p) => ({ ...p, notes: e.target.value }))} />
          <button className="btn primary" disabled={updating} onClick={handleStatusUpdate}>{updating ? "Updating..." : "Update"}</button>
        </div>
        {updateMsg ? <div className={`small mt-8 ${updateMsg.startsWith("Error") ? "text-danger" : "text-success"}`}>{updateMsg}</div> : null}
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")}><FaTruck /> Tracking</button>
          <button className={`tab ${activeTab === "vendor_msgs" ? "active" : ""}`} onClick={() => setActiveTab("vendor_msgs")}><FaComments /> Vendor Messages</button>
        </div>

        {activeTab === "tracking" ? (
          <>
            <div className="filters mt-10">
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {["all", "pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="badge">{filteredDelivery.length} records</div>
            </div>
            <div className="table-wrap mt-10">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th>Driver Phone</th>
                    <th>Company</th>
                    <th>Updated</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelivery.map((r, idx) => (
                    <tr key={safeText(r?.id || idx)}>
                      <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
                      <td><span className="badge">{safeText(r?.status)}</span></td>
                      <td>{displayText(r?.driver_name || r?.driverName)}</td>
                      <td>{displayText(r?.driver_phone || r?.driverPhone)}</td>
                      <td>{displayText(r?.delivery_company || r?.deliveryCompany)}</td>
                      <td>{displayText(r?.updated_at || r?.updatedAt).slice(0, 19).replace("T", " ")}</td>
                      <td>{displayText(r?.notes).slice(0, 80)}</td>
                    </tr>
                  ))}
                  {!filteredDelivery.length ? <tr><td colSpan={7} className="small">No delivery records yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {activeTab === "vendor_msgs" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Order ID</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {vendorMsgRows.map((r, idx) => (
                  <tr key={safeText(r?.id || idx)}>
                    <td>{displayText(r?.vendor_id || r?.vendorId).slice(0, 20)}</td>
                    <td>{displayText(r?.order_id || r?.orderId).slice(0, 20)}</td>
                    <td>{displayText(r?.channel)}</td>
                    <td><span className="badge">{safeText(r?.status)}</span></td>
                    <td>{displayText(r?.sent_at || r?.sentAt).slice(0, 19).replace("T", " ")}</td>
                    <td>{displayText(typeof r?.message_body === "object" ? JSON.stringify(r.message_body) : r?.message_body).slice(0, 100)}</td>
                  </tr>
                ))}
                {!vendorMsgRows.length ? <tr><td colSpan={6} className="small">No vendor messages sent yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ─── AI Support Workspace ─── */
export function AISupportWorkspace({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const aiConversations = useMemo(() => (byName.get(TABLES.AI_CONVERSATIONS)?.rows || []), [byName]);
  const telegramMessages = useMemo(() => (byName.get(TABLES.TELEGRAM_MESSAGES)?.rows || []), [byName]);
  const [activeTab, setActiveTab] = useState("conversations");
  const [detail, setDetail] = useState(null);

  const sortedConversations = useMemo(() => {
    return [...aiConversations].sort((a, b) =>
      new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime()
    );
  }, [aiConversations]);

  const sortedTelegram = useMemo(() => {
    return [...telegramMessages].sort((a, b) =>
      new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime()
    );
  }, [telegramMessages]);

  return (
    <>
      <div className="card">
        <div className="stat-grid">
          {statCard("AI Conversations", aiConversations.length, "live")}
          {statCard("Telegram Messages", telegramMessages.length, "live")}
          {statCard("Escalated", aiConversations.filter((c) => c?.escalated || c?.should_escalate).length, "alert")}
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === "conversations" ? "active" : ""}`} onClick={() => setActiveTab("conversations")}><FaRobot /> AI Conversations</button>
          <button className={`tab ${activeTab === "telegram" ? "active" : ""}`} onClick={() => setActiveTab("telegram")}><FaTelegramPlane /> Telegram Messages</button>
        </div>

        {activeTab === "conversations" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Intent</th>
                  <th>Message</th>
                  <th>AI Reply</th>
                  <th>Escalated</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedConversations.slice(0, 100).map((r, idx) => (
                  <tr key={safeText(r?.id || idx)} onClick={() => setDetail(r)} className="cursor-pointer">
                    <td>{displayText(r?.user_id || r?.userId || r?.phone).slice(0, 24)}</td>
                    <td><span className="badge">{safeText(r?.intent || r?.detected_intent)}</span></td>
                    <td>{displayText(r?.user_message || r?.message).slice(0, 80)}</td>
                    <td>{displayText(r?.ai_reply || r?.reply).slice(0, 80)}</td>
                    <td>{(r?.escalated || r?.should_escalate) ? "Yes" : "No"}</td>
                    <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))}
                {!sortedConversations.length ? <tr><td colSpan={6} className="small">No AI conversations yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "telegram" ? (
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>Chat ID</th>
                  <th>Direction</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedTelegram.slice(0, 100).map((r, idx) => (
                  <tr key={safeText(r?.id || idx)}>
                    <td>{displayText(r?.chat_id || r?.chatId).slice(0, 16)}</td>
                    <td><span className="badge">{safeText(r?.direction)}</span></td>
                    <td>{safeText(r?.message_type || r?.messageType)}</td>
                    <td>{displayText(typeof r?.content === "object" ? JSON.stringify(r.content) : r?.content).slice(0, 100)}</td>
                    <td>{displayText(r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))}
                {!sortedTelegram.length ? <tr><td colSpan={5} className="small">No Telegram messages logged yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="card mt-12">
          <div className="flex-between-center">
            <div className="fw-800">Conversation Detail</div>
            <button className="btn small" onClick={() => setDetail(null)}>Close</button>
          </div>
          <textarea className="textarea json-mini mt-8" value={JSON.stringify(detail, null, 2)} readOnly />
        </div>
      ) : null}
    </>
  );
}

export function BotsAgentsCard() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const payload = await http("/api/admin/bots/status");
      setStatus(payload || null);
    } catch (err) {
      setError(String(err?.message || err || "Failed to load bot status"));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const bots = status?.bots || {};
  const webhookPaths = status?.webhookPaths || {};
  const mode = safeText(status?.mode || "off");
  const webhookBase = safeText(status?.webhookBase || "");
  const agentModel = safeText(status?.agentModel || "gpt-4o-mini");
  const transcribeModel = safeText(status?.transcribeModel || "whisper-1");

  return (
    <div className="card">
      <div className="row mb-6">
        <h3 className="m-0"><FaRobot /> Bots & Agents</h3>
        <div className="flex-1" />
        <button className="btn small" onClick={refresh}><FaRedo /> Refresh</button>
      </div>
      {error ? <div className="warn mb-8">{error}</div> : null}
      <div className="grid-2">
        <div>
          <div className="small">Telegram Mode</div>
          <div className="badge">{mode || "off"}</div>
          <div className="small mt-8">Webhook Base</div>
          <div className="small">{webhookBase || "Not set"}</div>
          <div className="small mt-8">Webhook Paths</div>
          <div className="small">Admin: {safeText(webhookPaths.admin || "/telegram/admin")}</div>
          <div className="small">Support: {safeText(webhookPaths.support || "/telegram/support")}</div>
          <div className="small">Sales: {safeText(webhookPaths.sales || "/telegram/sales")}</div>
          <div className="small">Ops: {safeText(webhookPaths.ops || "/telegram/ops")}</div>
          <div className="small">Finance: {safeText(webhookPaths.finance || "/telegram/finance")}</div>
        </div>
        <div>
          <div className="small">Agent Model</div>
          <div className="badge">{agentModel}</div>
          <div className="small mt-8">Transcribe Model</div>
          <div className="badge">{transcribeModel}</div>
          <div className="small mt-8">Bots Enabled</div>
          <div className="mini-row wrap">
            {["admin", "support", "sales", "ops", "finance"].map((key) => (
              <span key={key} className={`badge cap ${bots[key] ? "green" : "warn"}`}>
                {key}: {bots[key] ? "on" : "off"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Refunds Workspace ─── */
export function RefundsWorkspace({ snapshot, onReload }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const refunds = useMemo(() => {
    const pull = (name) => Array.isArray(byName.get(name)?.rows) ? byName.get(name).rows : [];
    const rows = [
      ...pull(TABLES.BOOKINGS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.BOOKINGS) })),
      ...pull(TABLES.CAB_BOOKINGS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.CAB_BOOKINGS) })),
      ...pull(TABLES.BIKE_BOOKINGS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.BIKE_BOOKINGS) })),
      ...pull(TABLES.BUS_BOOKINGS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.BUS_BOOKINGS) })),
      ...pull(TABLES.FOOD_ORDERS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.FOOD_ORDERS) })),
      ...pull("ev_mart_orders").map((r) => ({ ...r, _refund_source_table: "ev_mart_orders" })),
      ...pull(TABLES.REFUNDS).map((r) => ({ ...r, _refund_source_table: tableDb(TABLES.REFUNDS) })),
    ];
    const isRefundRow = (r) => {
      const source = safeText(r?._refund_source_table);
      if (source === "ev_refunds") return true;
      const flag = r?.refund_flag ?? r?.refundFlag;
      const status = safeText(r?.refund_status || r?.refundStatus).toLowerCase();
      const reason = safeText(r?.refund_reason || r?.refundReason);
      return flag === true || !!status || !!reason;
    };
    return rows
      .filter(isRefundRow)
      .map((r) => {
        if (safeText(r?._refund_source_table) === "ev_refunds") {
          return {
            ...r,
            _refund_order_id: safeText(r?.order_id || r?.orderId),
            _refund_status: safeText(r?.status || "pending").toLowerCase(),
            _refund_reason: safeText(r?.reason),
            _refund_created_at: safeText(r?.created_at || r?.createdAt || ""),
            _refund_updated_at: safeText(r?.updated_at || r?.updatedAt || r?.created_at || r?.createdAt || ""),
          };
        }
        const rawStatus = safeText(r?.refund_status || r?.refundStatus || "pending").toLowerCase();
        const normalizedStatus = rawStatus === "approved" ? "processing" : (rawStatus === "processed" ? "completed" : rawStatus);
        return {
          ...r,
          _refund_order_id: safeText(r?.id),
          _refund_status: normalizedStatus || "pending",
          _refund_reason: safeText(r?.refund_reason || r?.refundReason),
          _refund_created_at: safeText(r?.refund_requested_at || r?.refundRequestedAt || r?.refund_created_at || r?.refundCreatedAt || r?.created_at || r?.createdAt || ""),
          _refund_updated_at: safeText(r?.refund_updated_at || r?.refundUpdatedAt || r?.updated_at || r?.updatedAt || ""),
        };
      })
      .sort((a, b) =>
        new Date(b?._refund_updated_at || b?._refund_created_at || 0).getTime() - new Date(a?._refund_updated_at || a?._refund_created_at || 0).getTime()
      );
  }, [byName]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [refundDebug, setRefundDebug] = useState("");

  const sourceLabel = (row) => {
    const source = safeText(row?._refund_source_table).toLowerCase();
    if (source === tableDb(TABLES.BOOKINGS)) return "Hotel Booking";
    if (source === tableDb(TABLES.CAB_BOOKINGS)) return "Cab Booking";
    if (source === tableDb(TABLES.BIKE_BOOKINGS)) return "Bike Booking";
    if (source === tableDb(TABLES.BUS_BOOKINGS)) return "Bus Booking";
    if (source === tableDb(TABLES.FOOD_ORDERS)) return "Food Order";
    if (source === "ev_mart_orders") return "Mart Order";
    if (source === tableDb(TABLES.REFUNDS)) return "Legacy Refund";
    return safeText(source || "Unknown");
  };

  const sourceOptions = useMemo(() => {
    const values = Array.from(new Set(refunds.map((row) => sourceLabel(row)).filter(Boolean)));
    return ["all", ...values];
  }, [refunds]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const statusOk = statusFilter === "all" ? true : safeText(r?._refund_status).toLowerCase() === statusFilter;
      const sourceOk = sourceFilter === "all" ? true : sourceLabel(r) === sourceFilter;
      return statusOk && sourceOk;
    });
  }, [refunds, statusFilter, sourceFilter]);

  const handleAction = async (row, newStatus) => {
    const sourceTable = safeText(row?._refund_source_table);
    const orderId = safeText(row?._refund_order_id || row?.order_id || row?.orderId || row?.id);
    const prevStatus = safeText(row?._refund_status || "").toLowerCase() || "pending";
    const debugAt = new Date().toISOString();
    try {
      console.info("[REFUND_ADMIN_DEBUG] status_update:start", {
        sourceTable,
        orderId,
        prevStatus,
        newStatus: safeText(newStatus).toLowerCase(),
        at: debugAt
      });
      if (sourceTable === "ev_refunds") {
        throw new Error("LEGACY_REFUND_ROW_READ_ONLY");
      }
      await http("/api/admin/refunds/status", {
        method: "POST",
        body: JSON.stringify({
          table: sourceTable,
          orderId,
          status: newStatus,
          reason: safeText(row?._refund_reason || row?.refund_reason || row?.reason)
        })
      });
      const okMsg = `[REFUND_ADMIN_DEBUG] ${orderId} ${prevStatus} -> ${safeText(newStatus).toLowerCase()} @ ${debugAt}. User app polls /api/ai/my-orders every 15s for order history + bell notification updates.`;
      console.info("[REFUND_ADMIN_DEBUG] status_update:success", {
        sourceTable,
        orderId,
        prevStatus,
        newStatus: safeText(newStatus).toLowerCase(),
        at: debugAt,
        expectation: "user_order_history_and_notification_should_update_within_15s"
      });
      setRefundDebug(okMsg);
      onReload();
    } catch (err) {
      const failMsg = String(err?.message || "Unknown");
      console.error("[REFUND_ADMIN_DEBUG] status_update:error", {
        sourceTable,
        orderId,
        prevStatus,
        newStatus: safeText(newStatus).toLowerCase(),
        message: failMsg,
        at: debugAt
      });
      setRefundDebug(`[REFUND_ADMIN_DEBUG] Failed for ${orderId}: ${failMsg}`);
      alert("Error updating refund: " + (err.message || "Unknown"));
    }
  };

  return (
    <>
      <div className="card">
        <div className="filters">
          <h3 className="m-0"><FaUndoAlt /> Refund Requests</h3>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {["all", "pending", "processing", "rejected", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            {sourceOptions.map((s) => <option key={s} value={s}>{s === "all" ? "All Order Types" : s}</option>)}
          </select>
          <div className="badge">{filteredRefunds.length} refunds</div>
        </div>
        <div className="small mt-8">Newest refund requests appear first.</div>
        {refundDebug ? <div className="small mt-8">{refundDebug}</div> : null}
        <div className="table-wrap mt-10">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map((r, idx) => (
                <tr key={safeText(r?.id || idx)}>
                  <td>{displayText(r?._refund_order_id || r?.order_id || r?.orderId).slice(0, 20)}</td>
                  <td>{sourceLabel(r)}</td>
                  <td>{displayText(r?.name || r?.customer_name || r?.customerName || r?.user_name || r?.userName).slice(0, 30)}</td>
                  <td>{displayText(r?.email).slice(0, 40)}</td>
                  <td>{displayText(r?.phone || r?.phone_number || r?.phonenumber).slice(0, 20)}</td>
                  <td>{displayText(r?._refund_reason || r?.reason).slice(0, 60)}</td>
                  <td>{displayText(r?.amount || r?.refund_amount || r?.total_amount || r?.total_fare || r?.estimated_fare)}</td>
                  <td>
                    <select
                      className="input"
                      value={safeText(r?._refund_status) || "pending"}
                      onChange={(e) => handleAction(r, e.target.value)}
                      disabled={safeText(r?._refund_source_table) === "ev_refunds"}
                    >
                      {["pending", "processing", "rejected", "completed"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{displayText(r?._refund_created_at || r?.created_at || r?.createdAt).slice(0, 19).replace("T", " ")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {safeText(r?._refund_source_table) === "ev_refunds" ? (
                      <span className="small">legacy row</span>
                    ) : safeText(r?._refund_status).toLowerCase() === "pending" ? (
                      <div className="flex-gap6">
                        <button className="btn small primary" onClick={() => handleAction(r, "processing")}>Start</button>
                        <button className="btn small" onClick={() => handleAction(r, "rejected")}>Reject</button>
                      </div>
                    ) : safeText(r?._refund_status).toLowerCase() === "processing" ? (
                      <button className="btn small primary" onClick={() => handleAction(r, "completed")}>Mark Completed</button>
                    ) : (
                      <span className="small">{safeText(r?._refund_status)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredRefunds.length ? <tr><td colSpan={10} className="small">No refund requests yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Notifications Workspace ─── */
export function NotificationsWorkspace({ items, onOpen, onDismiss }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [targetInput, setTargetInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const parseTargetValues = () =>
    safeText(targetInput)
      .split(/[\n,]+/g)
      .map((x) => safeText(x).trim())
      .filter(Boolean)
      .slice(0, 1000);

  const sendPush = async () => {
    const cleanTitle = safeText(title).trim();
    const cleanMessage = safeText(message).trim();
    if (!cleanTitle || !cleanMessage) {
      setSendResult("Title and message are required.");
      return;
    }
    const values = parseTargetValues();
    const body = { title: cleanTitle, message: cleanMessage, target };
    if (target === "users") body.userIds = values;
    if (target === "phones") body.phones = values;
    if (target === "emails") body.emails = values;
    if (target !== "all" && !values.length) {
      setSendResult("Please add target values (comma or newline separated).");
      return;
    }

    setSending(true);
    setSendResult("");
    try {
      const out = await http("/api/admin/push-notifications/send", {
        method: "POST",
        body: JSON.stringify(body)
      });
      const sent = Number(out?.sentCount || 0);
      setSendResult(`Push sent successfully to ${sent} user${sent === 1 ? "" : "s"}.`);
      setTitle("");
      setMessage("");
      setTargetInput("");
    } catch (err) {
      setSendResult(String(err?.message || err || "Failed to send push notification."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <div className="filters">
        <h3 className="m-0"><FaBell /> Notifications</h3>
        <div className="badge">{items.length} items</div>
      </div>
      <div className="card mt-10">
        <h4 className="m-0">Send Push Notification</h4>
        <div className="grid grid-2 mt-10">
          <div className="field">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Promotion update" />
          </div>
          <div className="field">
            <label>Target</label>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">All users</option>
              <option value="users">Specific user IDs</option>
              <option value="phones">Specific phones</option>
              <option value="emails">Specific emails</option>
            </select>
          </div>
        </div>
        <div className="field mt-8">
          <label>Message</label>
          <textarea
            className="textarea"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your order updates are now live in the app."
          />
        </div>
        {target !== "all" ? (
          <div className="field mt-8">
            <label>Target values (comma or new line separated)</label>
            <textarea
              className="textarea"
              rows={3}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={target === "users" ? "user_123,user_456" : target === "phones" ? "+919999999999,+918888888888" : "a@x.com,b@y.com"}
            />
          </div>
        ) : null}
        <div className="flex-gap10-wrap mt-10">
          <button className="btn primary" onClick={sendPush} disabled={sending}>
            {sending ? "Sending..." : "Send Push"}
          </button>
          {sendResult ? <div className="small">{sendResult}</div> : null}
        </div>
      </div>
      <div className="notif-list">
        {items.map((n) => (
          <div key={`${n.type}:${n.id}`} className="notif-item">
            <div className="notif-meta">
              <div className="notif-type">{n.type}</div>
              <div className="notif-status">{n.status || "pending"}</div>
            </div>
            <div className="notif-title-row">{n.title || n.id || "New request"}</div>
            <div className="notif-date">{n.date ? n.date.toString().slice(0, 19).replace("T", " ") : ""}</div>
            <div className="flex-gap6">
              <button className="btn small" onClick={() => onOpen(n)}>View</button>
              <button className="btn small danger" onClick={() => onDismiss(n)}>Dismiss</button>
            </div>
          </div>
        ))}
        {!items.length ? <div className="small">No notifications.</div> : null}
      </div>
    </div>
  );
}

/* ─── Reviews Workspace (used on dashboard) ─── */
export function ReviewsWidget({ snapshot }) {
  const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
  const byName = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.name, t));
    return m;
  }, [snapshot]);

  const reviews = useMemo(() => {
    const rows = byName.get(TABLES.REVIEWS)?.rows || [];
    return [...rows].sort((a, b) =>
      new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );
  }, [byName]);

  if (!reviews.length) return null;

  return (
    <div className="card mt-12">
      <h3 className="mt-0"><FaStar className="review-star" /> Recent Reviews</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Entity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.slice(0, 20).map((r, idx) => (
              <tr key={safeText(r?.id || idx)}>
                <td>{displayText(r?.user_name || r?.user_id).slice(0, 24)}</td>
                <td>{"★".repeat(Math.min(5, Math.max(0, parseInt(r?.rating) || 0)))}</td>
                <td>{displayText(r?.comment).slice(0, 80)}</td>
                <td>{displayText(r?.entity_type)}: {displayText(r?.entity_id).slice(0, 16)}</td>
                <td>{displayText(r?.created_at).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export function BookingsTable({ rows, onOpenRow, onOpenImages, onUpsert, onPatch, onReload, catalogLookup }) {
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  const rowStatusClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "row-status-pending";
    if (s.includes("refund") || s === "cancelled") return "row-status-refund";
    if (s === "confirmed" || s === "completed") return "row-status-confirmed";
    return "";
  };
  const statusSelectClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "status-select-pending";
    if (s.includes("refund") || s === "cancelled") return "status-select-refund";
    if (s === "confirmed" || s === "completed") return "status-select-confirmed";
    return "status-select-pending";
  };

  const resolveItem = (row) => {
    const type = safeText(row?.type || "").toLowerCase();
    const itemId = safeText(row?.item_id || row?.itemId || "");
    if (!type || !itemId) return null;
    if (type === "tour") return catalogLookup?.toursById?.get(itemId) || null;
    if (type === "hotel") return catalogLookup?.hotelsById?.get(itemId) || null;
    return null;
  };

  const setStatus = async (row, nextStatus) => {
    const id = safeText(row?.id);
    if (!id) return;
    setBusyId(id);
    setErr("");
    try {
      if (onPatch) {
        await onPatch(TABLES.BOOKINGS, id, { status: nextStatus });
      } else {
        await onUpsert(TABLES.BOOKINGS, [{ ...(row || {}), id, status: nextStatus }]);
      }
      await onReload();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusyId("");
    }
  };

  const refund = async (row) => {
    const id = safeText(row?.id);
    if (!id) return;
    setBusyId(id);
    setErr("");
    try {
      if (onPatch) {
        await onPatch(TABLES.BOOKINGS, id, { status: "cancelled" });
      } else {
        await onUpsert(TABLES.BOOKINGS, [{ ...(row || {}), id, status: "cancelled" }]);
      }
      await onUpsert(TABLES.AUDIT_LOG, [{
        id: makeUuid(),
        at: new Date().toISOString(),
        action: "refund",
        entity: "booking",
        entity_id: id,
        meta: { note: "Refund requested from admin dashboard" }
      }]);
      await onReload();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusyId("");
    }
  };

  const amountFromPricing = (pricing) => {
    if (!pricing) return "";
    const p = typeof pricing === "string" ? (safeJsonParse(pricing) || {}) : pricing;
    const total = p?.totalAmount ?? p?.total_amount ?? p?.total ?? null;
    return total === null || total === undefined ? "" : String(total);
  };

  return (
    <>
      {err ? <div className="warn mb-10">{err}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th className="thumb-cell">image</th>
            <th>Status</th>
            <th>Name</th>
            <th>Item</th>
            <th>Guests</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, idx) => {
            const id = safeText(row?.id || idx);
            const item = resolveItem(row);
            const itemUrls = item ? extractImageUrlsFromRow(item) : [];
            const bookingUrls = extractImageUrlsFromRow(row);
            const urls = uniqStrings([...(itemUrls || []), ...(bookingUrls || [])]);
            const busy = busyId === id;
            return (
              <tr key={id} className={rowStatusClass(row?.status)} onClick={() => onOpenRow(id)}>
                <td>{id}</td>
                <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                  {urls[0] ? <img className="thumb" src={urls[0]} alt="" onClick={() => onOpenImages("Booking images", urls, 0)} /> : null}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
        <select
          className={`select status-select ${statusSelectClass(row?.status)}`}
          value={safeText(row?.status || "pending")}
          disabled={busy}
          onChange={(e) => setStatus(row, e.target.value)}
        >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
                <td>{displayText(row?.user_name || row?.userName).slice(0, 60)}</td>
                <td>{displayText(row?.item_id || row?.itemId).slice(0, 60)}</td>
                <td>{displayText(row?.guests)}</td>
                <td>{displayText(amountFromPricing(row?.pricing))}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex-gap8-wrap">
                <button className="btn small" disabled={busy} onClick={() => setStatus(row, "cancelled")}>Cancel</button>
                    <button className="btn small danger" disabled={busy} onClick={() => refund(row)}>Refund</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function CabBookingsTable({ rows, onOpenRow, onUpsert, onPatch, onReload, cabRatesById }) {
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  const rowStatusClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "row-status-pending";
    if (s.includes("refund") || s === "cancelled") return "row-status-refund";
    if (s === "confirmed" || s === "completed") return "row-status-confirmed";
    return "";
  };
  const statusSelectClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "status-select-pending";
    if (s.includes("refund") || s === "cancelled") return "status-select-refund";
    if (s === "confirmed" || s === "completed") return "status-select-confirmed";
    return "status-select-pending";
  };

  const setStatus = async (row, nextStatus) => {
    const bookingId = safeText(row?.id);
    if (!bookingId) return;
    setBusyId(bookingId);
    setErr("");
    try {
      if (onPatch) {
        await onPatch(TABLES.CAB_BOOKINGS, bookingId, { status: nextStatus });
      } else {
        await onUpsert(TABLES.CAB_BOOKINGS, [{ ...(row || {}), status: nextStatus }]);
      }
      await onReload();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      {err ? <div className="warn mb-10">{err}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Pickup</th>
            <th>Drop</th>
            <th>Date/Time</th>
            <th>Fare</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, idx) => {
            const id = safeText(row?.id || idx);
            const busy = busyId === id;
            const status = safeText(row?.status).toLowerCase();
            return (
              <tr key={id} className={rowStatusClass(row?.status)} onClick={() => onOpenRow?.(id)}>
                <td>{id}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className={`select status-select ${statusSelectClass(row?.status)}`}
                    value={safeText(row?.status || "pending")}
                    disabled={busy}
                    onChange={(e) => setStatus(row, e.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
                <td>{displayText(row?.user_name || row?.userName).slice(0, 60)}</td>
                <td>{displayText(row?.phone).slice(0, 24)}</td>
                <td>{displayText(row?.pickup_location || row?.pickupLocation).slice(0, 80)}</td>
                <td>{displayText(row?.drop_location || row?.dropLocation).slice(0, 80)}</td>
                <td>{displayText(row?.datetime).slice(0, 24)}</td>
                <td>{displayText(resolveCabBookingFare(row, cabRatesById)).slice(0, 20)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex-gap8-wrap">
                    <button
                      className={`btn small ${status === "confirmed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => setStatus(row, "confirmed")}
                    >
                      Confirm
                    </button>
                    <button
                      className={`btn small ${status === "completed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => setStatus(row, "completed")}
                    >
                      Complete
                    </button>
                    <button className="btn small danger" disabled={busy} onClick={() => setStatus(row, "cancelled")}>Cancel</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function BikeBookingsTable({ rows, onOpenRow, onUpsert, onPatch, onReload }) {
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  const rowStatusClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "row-status-pending";
    if (s.includes("refund") || s === "cancelled") return "row-status-refund";
    if (s === "confirmed" || s === "completed") return "row-status-confirmed";
    return "";
  };

  const statusSelectClass = (statusValue) => {
    const s = safeText(statusValue).toLowerCase();
    if (!s || s === "pending" || s === "new" || s === "open" || s === "unread") return "status-select-pending";
    if (s.includes("refund") || s === "cancelled") return "status-select-refund";
    if (s === "confirmed" || s === "completed") return "status-select-confirmed";
    return "status-select-pending";
  };

  const setStatus = async (row, nextStatus) => {
    const bookingId = safeText(row?.id);
    if (!bookingId) return;
    setBusyId(bookingId);
    setErr("");
    try {
      if (onPatch) {
        await onPatch(TABLES.BIKE_BOOKINGS, bookingId, { status: nextStatus });
      } else {
        await onUpsert(TABLES.BIKE_BOOKINGS, [{ ...(row || {}), status: nextStatus }]);
      }
      await onReload();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      {err ? <div className="warn mb-10">{err}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Vehicle</th>
            <th>Pickup</th>
            <th>Drop</th>
            <th>Pickup Time</th>
            <th>Drop Time</th>
            <th>Total Fare</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, idx) => {
            const id = safeText(row?.id || idx);
            const busy = busyId === id;
            const status = safeText(row?.status).toLowerCase();
            return (
              <tr key={id} className={rowStatusClass(row?.status)} onClick={() => onOpenRow?.(id)}>
                <td>{id}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className={`select status-select ${statusSelectClass(row?.status)}`}
                    value={safeText(row?.status || "pending")}
                    disabled={busy}
                    onChange={(e) => setStatus(row, e.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
                <td>{displayText(row?.user_name || row?.userName).slice(0, 60)}</td>
                <td>{displayText(row?.phone).slice(0, 24)}</td>
                <td>{displayText(row?.vehicle_name || row?.vehicleName || row?.bike_type || row?.bikeType).slice(0, 42)}</td>
                <td>{displayText(row?.pickup_location || row?.pickupLocation).slice(0, 80)}</td>
                <td>{displayText(row?.drop_location || row?.dropLocation).slice(0, 80)}</td>
                <td>{displayText(row?.pickup_datetime || row?.start_datetime || row?.startDateTime).slice(0, 24)}</td>
                <td>{displayText(row?.drop_datetime || row?.end_datetime || row?.endDateTime).slice(0, 24)}</td>
                <td>{displayText(parseBikePricingAmount(row?.pricing) || row?.total_fare || row?.totalFare || "").slice(0, 20)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex-gap8-wrap">
                    <button
                      className={`btn small ${status === "confirmed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => setStatus(row, "confirmed")}
                    >
                      Confirm
                    </button>
                    <button
                      className={`btn small ${status === "completed" ? "primary" : "neutral"}`}
                      disabled={busy}
                      onClick={() => setStatus(row, "completed")}
                    >
                      Complete
                    </button>
                    <button className="btn small danger" disabled={busy} onClick={() => setStatus(row, "cancelled")}>Cancel</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function TrackingTable({ rows }) {
  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? rows.slice() : [];
    list.sort((a, b) => new Date(b?.at || 0).getTime() - new Date(a?.at || 0).getTime());
    return list;
  }, [rows]);

  const getMeta = (row) => {
    if (!row) return {};
    if (row.meta && typeof row.meta === "object") return row.meta;
    return safeJsonParse(row.meta) || {};
  };

  const pageText = (row) => {
    const meta = getMeta(row);
    return safeText(meta.screen || meta.path || meta.url || "");
  };

  const ipText = (row) => {
    const meta = getMeta(row);
    return safeText(meta.ipAddress || meta.ip || "");
  };

  const browserText = (row) => {
    const meta = getMeta(row);
    const b = safeText(meta.browser || "");
    return b.length > 64 ? `${b.slice(0, 61)}...` : b;
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>At</th>
          <th>Type</th>
          <th>User</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Page</th>
          <th>IP</th>
          <th>Browser</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, idx) => (
          <tr key={safeText(row?.id || idx)}>
            <td>{displayText(row?.at).slice(0, 19).replace("T", " ")}</td>
            <td>{displayText(row?.type)}</td>
            <td>{displayText(row?.user_id || row?.userId)}</td>
            <td>{displayText(row?.phone)}</td>
            <td>{displayText(row?.email)}</td>
            <td>{displayText(pageText(row))}</td>
            <td>{displayText(ipText(row))}</td>
            <td>{displayText(browserText(row))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

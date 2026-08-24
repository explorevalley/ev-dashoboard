import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
  FaSignOutAlt,
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
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaImages,
  FaTimes
} from "react-icons/fa";
import DashboardPage from "./pages/DashboardPage";
import OrderManagerPage from "./pages/OrderManagerPage";
import GalleryPage from "./pages/GalleryPage";
import ExploreValleyPage from "./pages/ExploreValleyPage";
import ToursPage from "./pages/ToursPage";
import HotelsPage from "./pages/HotelsPage";
import CottagesPage from "./pages/CottagesPage";
import FoodVendorsPage from "./pages/FoodVendorsPage";
import MartsProductsPage from "./pages/MartsProductsPage";
import CabProvidersPage from "./pages/CabProvidersPage";
import BikeRentalsPage from "./pages/BikeRentalsPage";
import BusesPage from "./pages/BusesPage";
import OrdersPage from "./pages/OrdersPage";
import CustomerSupportPage from "./pages/CustomerSupportPage";
import InvoicesPage from "./pages/InvoicesPage";
import DeliveryPage from "./pages/DeliveryPage";
import DeliveryPincodesPage from "./pages/DeliveryPincodesPage";
import CustomersPage from "./pages/CustomersPage";
import AISupportPage from "./pages/AISupportPage";
import RefundsPage from "./pages/RefundsPage";
import NotificationsPage from "./pages/NotificationsPage";
import TrackingPage from "./pages/TrackingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import DataCrudPage from "./pages/DataCrudPage";
import CategoryIconsPage from "./pages/CategoryIconsPage";
import FoodMenuIconsPage from "./pages/FoodMenuIconsPage";
import FoodVendorsWorkspace from "./components/FoodVendorsWorkspace";
import MartCatalogWorkspace from "./components/MartCatalogWorkspace";
import PricingControlsWorkspace from "./components/PricingControlsWorkspace";
import DashboardControlsWorkspace from "./components/DashboardControlsWorkspace";
import DashboardUsersWorkspace from "./components/DashboardUsersWorkspace";
import FoodCategoryIconsWorkspace from "./components/FoodCategoryIconsWorkspace";
import FoodMenuIconsWorkspace from "./components/FoodMenuIconsWorkspace";
import DutyServicesWorkspace from "./components/DutyServicesWorkspace";
import AdsPromosWorkspace from "./components/AdsPromosWorkspace";
import DutyRequestsWorkspace from "./components/DutyRequestsWorkspace";
import MartVendorPortal from "./components/MartVendorPortal";
import MartVendorAdminWorkspace from "./components/MartVendorAdminWorkspace";
import DeliveryPincodesWorkspace from "./components/DeliveryPincodesWorkspace";
import FormEditor from "./components/FormEditor";
import {
  Pagination,
  BucketLibraryModal,
  GalleryWorkspace,
  CabRatesTable,
  BusesTable,
  BikeRentalsTable,
  EnquiriesWorkspace,
  ImageLightbox,
  LoginView,
  DashboardView,
  CustomersWorkspace,
  DeliveryWorkspace,
  AISupportWorkspace,
  BotsAgentsCard,
  RefundsWorkspace,
  NotificationsWorkspace,
  ReviewsWidget,
  BookingsTable,
  CabBookingsTable,
  BikeBookingsTable,
  TrackingTable,
  extractImageUrlsFromRow,
  keyColumnForTable,
  makeUuid,
  isLikelyCottage,
  NAV_ITEMS,
  PAGE_TABLES,
  PAGE_TITLE,
  http,
  adminApiForm
} from "./components/LegacyComponents";

const PAGE_SIZE = 20;
const DASHBOARD_SCOPE_CONFIG = Object.freeze({
  admin: {
    label: "Admin Dashboard",
    defaultPage: "dashboard",
    pages: []
  },
  travel: {
    label: "Travel Dashboard",
    defaultPage: "dashboard",
    pages: [
      "dashboard",
      "cab_providers",
      "buses",
      "bike_rentals",
      "tours",
      "hotels",
      "cottages",
      "cab_bookings",
      "bus_bookings",
      "bike_bookings",
      "tours_booking",
      "hotels_booking",
      "cottages_booking",
      "ad_banners"
    ]
  },
  food: {
    label: "FOOD | MART | DUTY",
    defaultPage: "dashboard",
    pages: ["dashboard", "food_vendors", "mart_vendor_admin", "mart_catalog", "duty_services", "duty_requests", "category_icons", "delivery_pincodes", "ad_banners"]
  },
  support: {
    label: "Customer Support Dashboard",
    defaultPage: "dashboard",
    pages: ["dashboard", "customer_support", "order_manager", "credential_manager", "delivery", "delivery_pincodes", "ai_support", "refunds"]
  },
  mart_vendor: {
    label: "Mart Vendor Portal",
    defaultPage: "dashboard",
    pages: ["dashboard"]
  }
});

function dashboardScopeLabel(scope) {
  return (DASHBOARD_SCOPE_CONFIG[safeText(scope).toLowerCase()] || DASHBOARD_SCOPE_CONFIG.travel).label;
}

function detectDashboardScope() {
  try {
    if (typeof window === "undefined") return "travel";
    const forcedScope = safeText(window.__EV_DASHBOARD_SCOPE || "").toLowerCase();
    if (forcedScope === "admin" || forcedScope === "all") return "admin";
    if (forcedScope === "food") return "food";
    if (forcedScope === "mart_vendor" || forcedScope === "vendor" || forcedScope === "martvendor") return "mart_vendor";
    if (forcedScope === "support" || forcedScope === "customer_support" || forcedScope === "customer-support") return "support";
    if (forcedScope === "travel") return "travel";
    const q = new URLSearchParams(String(window.location.search || "").replace(/^\?/, ""));
    const qp = safeText(q.get("dashboard") || "").toLowerCase();
    if (qp === "admin" || qp === "all") return "admin";
    if (qp === "food") return "food";
    if (qp === "mart_vendor" || qp === "vendor" || qp === "martvendor") return "mart_vendor";
    if (qp === "support" || qp === "customer_support" || qp === "customer-support") return "support";
    const parts = String(window.location.pathname || "").split("/").map((x) => safeText(x).toLowerCase()).filter(Boolean);
    const tail = parts[parts.length - 1] || "";
    if (tail === "admin" || tail === "all") return "admin";
    if (tail === "food") return "food";
    if (tail === "mart_vendor" || tail === "vendor" || tail === "martvendor") return "mart_vendor";
    if (tail === "support") return "support";
  } catch {}
  return "travel";
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
  offer: "Offer",
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
  min_nights: "Min Nights",
  minNights: "Min Nights",
  max_nights: "Max Nights",
  maxNights: "Max Nights",
  max_guests: "Package Size (People)",
  maxGuests: "Package Size (People)",
  capacity_by_date: "Capacity By Date",
  capacityByDate: "Capacity By Date",
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
  CAB_PROVIDERS: "cabPartners",
  TAXI_FARES: "taxiFares",
  BIKE_RENTALS: "bikeRentals",
  DUTY_SERVICES: "ev_duty_services",
  DUTY_REQUESTS: "ev_duty_requests",
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
  VENDOR_MESSAGES: "vendorComms",
  EMAIL_NOTIFICATIONS: "emailOutbox",
  REVIEWS: "reviewsBoard",
  REFUNDS: "refundQueue",
  BIKE_BOOKINGS: "bikeBookings"
  ,
  DRIVER_REG_REQUESTS: "driverRegistrationRequests",
  DRIVERS: "drivers",
  DRIVER_VEHICLES: "driverVehicles",
  DRIVER_DOCUMENTS: "driverDocuments",
  DRIVER_AVAILABILITY: "driverAvailability",
  DRIVER_BIDS: "driverBids",
  RIDE_ASSIGNMENTS: "rideAssignments"
});

const DASHBOARD_EXTRA_TABLES = Object.freeze({
  admin: [
    TABLES.BOOKINGS,
    TABLES.CAB_BOOKINGS,
    TABLES.BUS_BOOKINGS,
    TABLES.BIKE_BOOKINGS,
    TABLES.DRIVER_REG_REQUESTS,
    TABLES.DRIVERS,
    TABLES.DRIVER_BIDS,
    TABLES.RIDE_ASSIGNMENTS,
    TABLES.FOOD_ORDERS,
    TABLES.INVOICES,
    TABLES.QUERIES,
    TABLES.REFUNDS,
    TABLES.TOURS,
    TABLES.HOTELS,
    TABLES.BUSES,
    TABLES.CAB_PROVIDERS,
    TABLES.REVIEWS,
    TABLES.DUTY_REQUESTS,
    "ev_mart_orders"
  ],
  // TABLES.QUERIES joins the existing TABLES.REFUNDS here so the orders table's
  // Support column has something to read — travel now renders that table too.
  travel: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.BIKE_BOOKINGS, TABLES.DRIVER_REG_REQUESTS, TABLES.DRIVERS, TABLES.DRIVER_BIDS, TABLES.RIDE_ASSIGNMENTS, TABLES.REFUNDS, TABLES.QUERIES, TABLES.TOURS, TABLES.HOTELS, TABLES.BUSES, TABLES.CAB_PROVIDERS, TABLES.TAXI_FARES, TABLES.REVIEWS],
  // Refunds and support queries back the Refund / Refund Status / Support
  // columns on the orders table this scope renders. Without them those columns
  // are permanently blank here and a customer's complaint cannot pull its order
  // to the top of the list. This is the internal FOOD | MART | DUTY desk, not
  // the vendor portal — `mart_vendor` is deliberately left out, because the
  // snapshot endpoint returns whole tables with no per-vendor filtering.
  food: [TABLES.FOOD_ORDERS, "ev_mart_orders", TABLES.REFUNDS, TABLES.QUERIES, TABLES.REVIEWS, TABLES.DUTY_REQUESTS],
  support: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.BIKE_BOOKINGS, TABLES.FOOD_ORDERS, TABLES.INVOICES, TABLES.QUERIES, TABLES.REFUNDS]
});

/**
 * The dashboard page *is* the customer orders table for the scopes that get it,
 * so it is named for what it shows rather than for where it sits. Only Support
 * keeps "Dashboard": it lands on its refunds queue instead of the table.
 * Mirrors the scope test in pages/DashboardPage.jsx.
 */
const SCOPES_WITH_ORDER_TABLE = new Set(["food", "mart_vendor", "admin", "travel"]);
function dashboardPageLabel(scope) {
  return SCOPES_WITH_ORDER_TABLE.has(String(scope || "")) ? "Customer Orders" : "Dashboard";
}

const TRAVEL_NAV_ITEMS = Object.freeze([
  { key: "dashboard", label: "Dashboard", icon: FaHome },
  { key: "cab_providers", label: "Cab", icon: FaCar },
  { key: "buses", label: "Bus", icon: FaBus },
  { key: "bike_rentals", label: "Bike", icon: FaMotorcycle },
  { key: "tours", label: "Tours", icon: FaMapMarkerAlt },
  { key: "hotels", label: "Hotels", icon: FaHotel },
  { key: "cottages", label: "Cottages", icon: FaBed }
]);

const FOOD_NAV_ITEMS = Object.freeze([
  ...NAV_ITEMS.filter((item) => item.key !== "mart_catalog"),
  { key: "mart_vendor_admin", label: "Mart Vendor", icon: FaStore }
]);

const SUPPORT_NAV_ITEMS = Object.freeze([
  ...NAV_ITEMS.filter((item) => item.key !== "orders"),
  { key: "customer_support", label: "Customer Support", icon: FaComments },
  { key: "order_manager", label: "Order Manager", icon: FaClipboardList },
  { key: "credential_manager", label: "Credential Manager", icon: FaLock }
]);

const NAV_GROUP_DEFS = Object.freeze([
  { id: "overview", label: "Overview", keys: ["dashboard", "notifications"] },
  {
    id: "catalog",
    label: "Catalog",
    keys: [
      "gallery",
      "explorevalley",
      "tours",
      "hotels",
      "cottages",
      "food_vendors",
      "mart_vendor_admin",
      "mart_catalog",
      "cab_providers",
      "bike_rentals",
      "duty_services",
      "buses",
      "category_icons",
      "ad_banners",
      "order_manager"
    ]
  },
  {
    id: "operations",
    label: "Operations",
    keys: [
      "orders",
      "duty_requests",
      "customer_support",
      "delivery",
      "refunds",
      "cab_bookings",
      "bus_bookings",
      "bike_bookings",
      "tours_booking",
      "hotels_booking",
      "cottages_booking",
      "driver_requests",
      "drivers",
      "credential_manager"
    ]
  },
  { id: "invoices", label: "Invoices", keys: ["invoices"] },
  { id: "intelligence", label: "Intelligence", keys: ["customers", "ai_support", "tracking", "analytics"] },
  { id: "system", label: "System", keys: ["settings"] }
]);

const PAGE_TABLES_OVERRIDE = Object.freeze({
  orders: [TABLES.BOOKINGS, TABLES.CAB_BOOKINGS, TABLES.BUS_BOOKINGS, TABLES.FOOD_ORDERS, TABLES.MART_ORDERS],
  cab_bookings: [TABLES.CAB_BOOKINGS],
  cab_providers: [TABLES.DRIVER_REG_REQUESTS, TABLES.DRIVERS, TABLES.DRIVER_VEHICLES, TABLES.DRIVER_DOCUMENTS, TABLES.TAXI_FARES],
  driver_requests: [TABLES.DRIVER_REG_REQUESTS, TABLES.DRIVER_DOCUMENTS],
  drivers: [TABLES.DRIVERS, TABLES.DRIVER_VEHICLES, TABLES.DRIVER_AVAILABILITY, TABLES.DRIVER_BIDS, TABLES.RIDE_ASSIGNMENTS],
  bus_bookings: [TABLES.BUS_BOOKINGS],
  bike_bookings: [TABLES.BIKE_BOOKINGS],
  tours_booking: [TABLES.BOOKINGS],
  hotels_booking: [TABLES.BOOKINGS],
  cottages_booking: [TABLES.BOOKINGS],
  duty_services: [TABLES.DUTY_SERVICES, TABLES.REVIEWS],
  duty_requests: [TABLES.DUTY_REQUESTS, TABLES.QUERIES]
});

const PAGE_TITLE_OVERRIDE = Object.freeze({
  cab_bookings: "Cab Bookings",
  driver_requests: "Driver Requests",
  drivers: "Drivers",
  bus_bookings: "Bus Bookings",
  bike_bookings: "Bike Bookings",
  tours_booking: "Tours Booking",
  hotels_booking: "Hotels Booking",
  cottages_booking: "Cottages Booking",
  mart_vendor_admin: "Mart Vendor",
  credential_manager: "Credential Manager",
  category_icons: "Category Images",
  food_menu_icons: "Food Menu Icons",
  order_manager: "Order Manager"
  ,
  customer_support: "Customer Support"
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
  [TABLES.DRIVER_REG_REQUESTS]: "Driver Registration Requests",
  [TABLES.DRIVERS]: "Approved Drivers",
  [TABLES.DRIVER_VEHICLES]: "Driver Vehicles",
  [TABLES.DRIVER_DOCUMENTS]: "Driver Documents",
  [TABLES.DRIVER_AVAILABILITY]: "Driver Availability",
  [TABLES.DRIVER_BIDS]: "Driver Bids",
  [TABLES.RIDE_ASSIGNMENTS]: "Ride Assignments",
  [TABLES.CAB_PROVIDERS]: "Cab Providers",
  [TABLES.TAXI_FARES]: "Taxi Fares",
  [TABLES.BIKE_RENTALS]: "Bike Rentals",
  [TABLES.DUTY_SERVICES]: "Duty Services",
  [TABLES.DUTY_REQUESTS]: "Duty Requests",
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
  [TABLES.DRIVER_REG_REQUESTS]: "ev_driver_registration_requests",
  [TABLES.DRIVERS]: "ev_drivers",
  [TABLES.DRIVER_VEHICLES]: "ev_driver_vehicles",
  [TABLES.DRIVER_DOCUMENTS]: "ev_driver_documents",
  [TABLES.DRIVER_AVAILABILITY]: "ev_driver_availability",
  [TABLES.DRIVER_BIDS]: "ev_cab_bids",
  [TABLES.RIDE_ASSIGNMENTS]: "ev_ride_assignments",
  [TABLES.CAB_PROVIDERS]: "ev_cab_rates",
  [TABLES.TAXI_FARES]: "ev_taxi_fares",
  [TABLES.BIKE_RENTALS]: "ev_rental_vehicles",
  [TABLES.DUTY_SERVICES]: "ev_duty_services",
  [TABLES.DUTY_REQUESTS]: "ev_duty_requests",
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

function normalizeObjectList(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === "object");
  }
  return [];
}

const HOTEL_SPACE_FACILITY_OPTIONS = Object.freeze({
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

function App() {
  const dashboardScope = detectDashboardScope();
  if (dashboardScope === "mart_vendor") {
    return <MartVendorPortal />;
  }
  const adminPages = Array.from(new Set([...NAV_ITEMS.map((item) => item.key), ...TRAVEL_NAV_ITEMS.map((item) => item.key)]));
  const dashboardConfig = DASHBOARD_SCOPE_CONFIG[dashboardScope] || DASHBOARD_SCOPE_CONFIG.travel;
  const allowedPages = dashboardScope === "admin" ? adminPages : (dashboardConfig.pages || []);
  const allowedPagesSet = new Set(allowedPages);
  const [authed, setAuthed] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [opsMode, setOpsMode] = useState(false);
  const [tab, setTab] = useState("table");
  const [tablePage, setTablePage] = useState(1);
  const [page, setPage] = useState(dashboardConfig.defaultPage || "dashboard");
  const [snapshot, setSnapshot] = useState({ tables: [] });
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [jsonDraft, setJsonDraft] = useState("[]");
  const [lightbox, setLightbox] = useState({ open: false, title: "", urls: [], index: 0 });
  const loadingRef = React.useRef(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifWrapRef = React.useRef(null);
  // Keep the panel open until the user clicks away or presses Escape. It used
  // to close on `mouseleave`, which dismissed it as soon as the pointer drifted.
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onPointerDown = (event) => {
      const wrap = notifWrapRef.current;
      if (wrap && !wrap.contains(event.target)) setNotifOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifOpen]);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => new Set());
  const [martVendorHeaderContent, setMartVendorHeaderContent] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("ev_admin_sidebar_collapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("ev_admin_sidebar_collapsed", sidebarCollapsed ? "1" : "0"); } catch {}
  }, [sidebarCollapsed]);
  const [categoryImagesOpen, setCategoryImagesOpen] = useState(false);
  useEffect(() => {
    if (!categoryImagesOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setCategoryImagesOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [categoryImagesOpen]);
  const navItems = useMemo(
    () => {
      const source = dashboardScope === "travel"
        ? TRAVEL_NAV_ITEMS
        : (dashboardScope === "admin" ? [...NAV_ITEMS, ...TRAVEL_NAV_ITEMS] : (dashboardScope === "food" ? FOOD_NAV_ITEMS : (dashboardScope === "support" ? SUPPORT_NAV_ITEMS : NAV_ITEMS)));
      const seen = new Set();
      const label = dashboardPageLabel(dashboardScope);
      return source
        .filter((item) => {
          if (!allowedPagesSet.has(item.key) || seen.has(item.key)) return false;
          seen.add(item.key);
          return true;
        })
        .map((item) => (item.key === "dashboard" ? { ...item, label } : item));
    },
    [dashboardScope, allowedPagesSet]
  );
  const navGroups = useMemo(() => {
    const byKey = new Map(navItems.map((item) => [item.key, item]));
    const used = new Set();
    const groups = NAV_GROUP_DEFS
      .map((g) => {
        const items = g.keys.map((k) => byKey.get(k)).filter(Boolean);
        items.forEach((x) => used.add(x.key));
        return { ...g, items };
      })
      .filter((g) => g.items.length);
    const leftovers = navItems.filter((item) => !used.has(item.key));
    if (leftovers.length) {
      groups.push({ id: "other", label: "Other", keys: [], items: leftovers });
    }
    return groups;
  }, [navItems]);

  useEffect(() => {
    const pageLabel = page === "dashboard"
      ? dashboardPageLabel(dashboardScope)
      : (PAGE_TITLE_OVERRIDE[page] || PAGE_TITLE[page] || "Dashboard");
    document.title = `ExploreValley ${dashboardConfig.label} · ${pageLabel}`;
  }, [dashboardConfig.label, page, dashboardScope]);

  useEffect(() => {
    if (!allowedPagesSet.has(page)) {
      setPage(dashboardConfig.defaultPage || "dashboard");
    }
  }, [page, dashboardScope]);

  const tablesByName = useMemo(() => {
    const map = new Map();
    (snapshot.tables || []).forEach((t) => map.set(t.name, t));
    return map;
  }, [snapshot]);

  const catalogLookup = useMemo(() => {
    const tours = (tablesByName.get(TABLES.TOURS)?.rows || []).slice();
    const hotels = (tablesByName.get(TABLES.HOTELS)?.rows || []).slice();
    const toursById = new Map();
    const hotelsById = new Map();
    tours.forEach((t) => toursById.set(String(t?.id || ""), t));
    hotels.forEach((h) => hotelsById.set(String(h?.id || ""), h));
    return { toursById, hotelsById };
  }, [tablesByName]);
  const cabRatesById = useMemo(() => {
    const map = new Map();
    const rows = (tablesByName.get(TABLES.CAB_PROVIDERS)?.rows || []);
    (rows || []).forEach((r) => {
      const id = String(r?.id || "").trim();
      if (!id) return;
      map.set(id, r);
    });
    return map;
  }, [tablesByName]);

  const currentTables = useMemo(() => {
    const names = PAGE_TABLES_OVERRIDE[page] || PAGE_TABLES[page] || [];
    return names.map((n) => tablesByName.get(n)).filter(Boolean);
  }, [page, tablesByName]);

  const activeTable = useMemo(() => {
    if (!currentTables.length) return null;
    if (selectedTable) {
      const hit = currentTables.find((t) => t.name === selectedTable);
      if (hit) return hit;
    }
    return currentTables[0];
  }, [currentTables, selectedTable]);

  // Some admin sections intentionally re-use the same underlying Supabase table.
  // Example: Hotels + Cottages both map to ev_hotels, but must show different rows.
  const effectiveTable = useMemo(() => {
    if (!activeTable) return null;
    if (activeTable.name === TABLES.BOOKINGS && (page === "tours_booking" || page === "hotels_booking" || page === "cottages_booking")) {
      const rows = Array.isArray(activeTable.rows) ? activeTable.rows : [];
      const filtered = rows.filter((r) => {
        const bookingType = safeText(r?.type).toLowerCase();
        const itemId = safeText(r?.item_id || r?.itemId);
        if (page === "tours_booking") return bookingType === "tour";
        if (bookingType !== "hotel") return false;
        const item = catalogLookup.hotelsById.get(itemId);
        const cottageById = itemId.toLowerCase().startsWith("cottage_");
        const cottage = item ? isLikelyCottage(item) : cottageById;
        return page === "cottages_booking" ? cottage : !cottage;
      });
      return { ...activeTable, rows: filtered, rowCount: filtered.length };
    }
    if (activeTable.name === TABLES.HOTELS && (page === "hotels" || page === "cottages")) {
      const rows = Array.isArray(activeTable.rows) ? activeTable.rows : [];
      const filtered = page === "cottages"
        ? rows.filter(isLikelyCottage)
        : rows.filter((r) => !isLikelyCottage(r));
      return { ...activeTable, rows: filtered, rowCount: filtered.length };
    }
    return activeTable;
  }, [activeTable, page, catalogLookup]);

  // Reset selection only when changing page/table, not when switching to Form tab.
  useEffect(() => {
    if (!effectiveTable) {
      setJsonDraft("[]");
      return;
    }
    setSelectedTable(effectiveTable.name);
    setSelectedRowKey("");
  }, [page, effectiveTable?.name]);

  // Keep JSON draft synced for table/form views, but don't clobber edits while in JSON tab.
  useEffect(() => {
    if (!effectiveTable) return;
    if (tab === "json") return;
    setJsonDraft(JSON.stringify(effectiveTable.rows || [], null, 2));
  }, [effectiveTable?.name, effectiveTable?.rowCount, tab]);

  const checkSession = async () => {
    setLoadingSession(true);
    try {
      await http("/api/admin/whoami");
      setAuthed(true);
      setOpsMode(false);
    } catch (e) {
      setAuthed(false);
      const msg = String(e?.message || e || "");
      if (msg.includes("PLATFORM_DISABLED") || msg.includes("DASHBOARD_DISABLED") || msg.includes("HTTP_503")) {
        setOpsMode(true);
      }
    } finally {
      setLoadingSession(false);
    }
  };

  const reload = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingData(true);
    setError("");
    try {
      const requestedAliases = Array.from(new Set(
        (allowedPages || [])
          .flatMap((p) => PAGE_TABLES[p] || [])
          .concat(DASHBOARD_EXTRA_TABLES[dashboardScope] || [])
          .filter(Boolean)
      ));
      const requestedDbTables = requestedAliases.map((alias) => tableDb(alias)).filter((name) => /^ev_[a-z0-9_]+$/i.test(String(name || "")));
      const qs = requestedDbTables.length
        ? `?tables=${encodeURIComponent(requestedDbTables.join(","))}`
        : "";
      const data = await http(`/api/admin/supabase/snapshot${qs}`);
      const tables = Array.isArray(data?.tables)
        ? data.tables.map((t) => ({ ...t, name: tableAlias(t?.name) }))
        : [];
      setSnapshot({ ...(data || {}), tables });
    } catch (e) {
      const msg = String(e?.message || e);
      setError(msg);
      if (msg.includes("PLATFORM_DISABLED") || msg.includes("DASHBOARD_DISABLED") || msg.includes("HTTP_503")) {
        setOpsMode(true);
      }
    } finally {
      setLoadingData(false);
      loadingRef.current = false;
    }
  };

  const logout = async () => {
    setError("");
    try {
      await http("/api/admin/logout", { method: "POST" });
    } catch {
      // If transport fails, still force local logout state.
    } finally {
      setAuthed(false);
      setOpsMode(false);
      setNotifOpen(false);
      setDismissedNotifs(new Set());
      setSnapshot({ tables: [] });
      setPage(dashboardConfig.defaultPage || "dashboard");
    }
  };

  const openImages = (title, urls, index = 0) => {
    const normalized = uniqStrings(urls || []);
    if (!normalized.length) return;
    setLightbox({ open: true, title: safeText(title), urls: normalized, index });
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (authed) reload();
  }, [authed]);

  useEffect(() => {
    if (!authed) return undefined;
    if (dashboardScope === "food" || dashboardScope === "travel") return undefined;
    const id = setInterval(() => {
      reload();
    }, 30000);
    return () => clearInterval(id);
  }, [authed, dashboardScope]);

  const saveJson = async () => {
    if (!activeTable) return; // always save to the real underlying table
    try {
      const parsed = JSON.parse(jsonDraft);
      const rows = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
      if (!rows.length) throw new Error("JSON must be an array of rows or a single row object");
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: tableDb(activeTable.name), rows })
      });
      await reload();
      setTab("table");
    } catch (e) {
      const raw = String(e?.message || e || "");
      if (/Unexpected non-whitespace character after JSON/i.test(raw)) {
        setError("Invalid JSON syntax. Remove trailing comma and wrap rows in [ ... ] or provide a single object.");
      } else {
        setError(raw);
      }
    }
  };

  const saveForm = async (row) => {
    if (!activeTable) return;
    try {
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: tableDb(activeTable.name), rows: [row] })
      });
      await reload();
      setTab("table");
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  /**
   * Writes ONLY the named columns of one row.
   *
   * Use this for anything that changes a single field - a status toggle, an
   * availability switch, an uploaded image. The alternative, spreading the
   * snapshot row into an upsert, rewrites every column of the record from a
   * copy that may already be stale, so an unrelated edit made since the last
   * reload is silently reverted.
   */
  const patchRow = async (tableName, id, patch, keyColumn = "id", extra = {}) => {
    await http("/api/admin/supabase/update", {
      method: "POST",
      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, patch, ...extra })
    });
    setSnapshot((prev) => {
      const tables = Array.isArray(prev?.tables) ? prev.tables.slice() : [];
      const tableIdx = tables.findIndex((t) => t?.name === tableName);
      if (tableIdx < 0) return prev;
      const table = tables[tableIdx];
      const existingRows = Array.isArray(table?.rows) ? table.rows.slice() : [];
      let touched = false;
      const nextRows = existingRows.map((row) => {
        if (safeText(row?.[keyColumn] ?? row?.id ?? "") !== safeText(id)) return row;
        touched = true;
        return { ...row, ...patch };
      });
      if (!touched) return prev;
      tables[tableIdx] = { ...table, rows: nextRows };
      return { ...prev, tables };
    });
  };

  const upsertPartial = async (tableName, rows) => {
    await http("/api/admin/supabase/upsert", {
      method: "POST",
      body: JSON.stringify({ table: tableDb(tableName), rows })
    });
    setSnapshot((prev) => {
      const tables = Array.isArray(prev?.tables) ? prev.tables.slice() : [];
      const tableIdx = tables.findIndex((t) => t?.name === tableName);
      if (tableIdx < 0) return prev;
      const table = tables[tableIdx];
      const existingRows = Array.isArray(table?.rows) ? table.rows.slice() : [];
      const keyCol = keyColumnForTable(table);
      const indexByKey = new Map();
      existingRows.forEach((r, idx) => {
        const k = safeText(r?.[keyCol] ?? r?.id ?? "");
        if (k) indexByKey.set(k, idx);
      });
      (Array.isArray(rows) ? rows : []).forEach((nextRow) => {
        const k = safeText(nextRow?.[keyCol] ?? nextRow?.id ?? "");
        if (!k) {
          existingRows.unshift(nextRow);
          return;
        }
        const at = indexByKey.get(k);
        if (at === undefined) {
          existingRows.unshift(nextRow);
          indexByKey.set(k, 0);
        } else {
          existingRows[at] = { ...(existingRows[at] || {}), ...(nextRow || {}) };
        }
      });
      tables[tableIdx] = {
        ...table,
        rows: existingRows,
        rowCount: existingRows.length
      };
      return { ...prev, tables };
    });
  };

  const filteredRows = useMemo(() => {
    if (!effectiveTable) return [];
    const q = search.trim().toLowerCase();
    if (!q) return effectiveTable.rows || [];
    return (effectiveTable.rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [effectiveTable, search]);
  useEffect(() => {
    setTablePage(1);
  }, [selectedTable, search, page, tab]);

  const selectedRow = useMemo(() => {
    if (!effectiveTable) return null;
    const rows = effectiveTable.rows || [];
    if (!rows.length) return null;
    if (selectedRowKey === "__new__") return null;
    if (!selectedRowKey) return rows[0];
    return rows.find((r) => String(r.id || r.slug || r.code || r.restaurant_id || "") === selectedRowKey) || rows[0];
  }, [effectiveTable, selectedRowKey]);

  const hasImages = useMemo(() => {
    if (!effectiveTable) return false;
    if (page === "cottages") return true;
    const rows = (effectiveTable.rows || []).slice(0, 25);
    return rows.some((r) => extractImageUrlsFromRow(r).length > 0);
  }, [effectiveTable?.name, effectiveTable?.rowCount, page]);

  const keyCol = effectiveTable ? keyColumnForTable(effectiveTable) : "id";
  const heavyCols = new Set(["images", "image_meta", "hero_image", "image", "content"]);
  const baseCols = effectiveTable ? (effectiveTable.columns || []).map((c) => c.name) : [];
  const firstDisplayCol = (page === "tours" && baseCols.includes("title")) ? "title" : keyCol;
  const orderedCols = useMemo(() => {
    if (!effectiveTable) return [];
    const visibleCols = baseCols.filter((n) => n !== firstDisplayCol && !heavyCols.has(n));
    if ((page === "hotels" || page === "cottages") && effectiveTable.name === TABLES.HOTELS) {
      const hotelPriority = [
        "location",
        "price_per_night",
        "pricePerNight",
        "room_types",
        "roomTypes",
        "min_nights",
        "minNights",
        "max_nights",
        "maxNights",
        "available"
      ];
      const prioritized = hotelPriority.filter((c, idx, arr) => visibleCols.includes(c) && arr.indexOf(c) === idx);
      const rest = visibleCols.filter((c) => !prioritized.includes(c));
      return [firstDisplayCol, ...prioritized, ...rest].slice(0, 8);
    }
    return [firstDisplayCol, ...visibleCols.slice(0, 7)];
  }, [effectiveTable, baseCols, firstDisplayCol, page]);
  const ActivePageIcon = navItems.find((item) => item.key === page)?.icon || NAV_ITEMS.find((item) => item.key === page)?.icon || FaHome;
  const notificationCount = useMemo(() => {
    const pending = new Set(["pending", "new", "open", "unread"]);
    const countByStatus = (rows) => (rows || []).filter((r) => pending.has(safeText(r?.status).toLowerCase())).length;
    const bookings = countByStatus(tablesByName.get(TABLES.BOOKINGS)?.rows || []);
    const cab = countByStatus(tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || []);
    const bus = countByStatus(tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || []);
    const bike = countByStatus(tablesByName.get(TABLES.BIKE_BOOKINGS)?.rows || []);
    const food = countByStatus(tablesByName.get(TABLES.FOOD_ORDERS)?.rows || []);
    const queries = countByStatus(tablesByName.get(TABLES.QUERIES)?.rows || []);
    const total = dashboardScope === "travel"
      ? bookings + cab + bus + bike
      : (dashboardScope === "food" ? food : (bookings + cab + bus + bike + food + queries));
    return Math.max(0, total - dismissedNotifs.size);
  }, [tablesByName, dismissedNotifs, dashboardScope]);
  const notificationItems = useMemo(() => {
    const pending = new Set(["pending", "new", "open", "unread"]);
    const fallbackPageKey = allowedPagesSet.has("dashboard")
      ? "dashboard"
      : (allowedPages[0] || "dashboard");
    const resolvePageKey = (key) => allowedPagesSet.has(key) ? key : fallbackPageKey;
    const normalize = (rows, type, pageKey, titleKey, dateKey) => (rows || [])
      .filter((r) => pending.has(safeText(r?.status).toLowerCase()))
      .map((r) => ({
        id: safeText(r?.id || ""),
        type,
        status: safeText(r?.status || ""),
        title: safeText(r?.[titleKey] || r?.user_name || r?.userName || r?.customer_name || r?.customerName || r?.order_id || r?.orderId || ""),
        date: safeText(r?.[dateKey] || r?.created_at || r?.createdAt || r?.order_time || r?.orderTime || r?.submitted_at || r?.submittedAt || ""),
        pageKey: resolvePageKey(pageKey)
      }));
    const travelList = [
      ...normalize(tablesByName.get(TABLES.BOOKINGS)?.rows || [], "Hotel Booking", "hotels_booking", "user_name", "booking_date"),
      ...normalize(tablesByName.get(TABLES.CAB_BOOKINGS)?.rows || [], "Cab Booking", "cab_bookings", "user_name", "datetime"),
      ...normalize(tablesByName.get(TABLES.BUS_BOOKINGS)?.rows || [], "Bus Booking", "bus_bookings", "user_name", "travel_date"),
      ...normalize(tablesByName.get(TABLES.BIKE_BOOKINGS)?.rows || [], "Bike Booking", "bike_bookings", "user_name", "created_at"),
    ];
    const foodList = [
      ...normalize(tablesByName.get(TABLES.FOOD_ORDERS)?.rows || [], "Food Order", "orders", "user_name", "order_time"),
    ];
    const supportList = [
      ...travelList,
      ...foodList,
      ...normalize(tablesByName.get(TABLES.QUERIES)?.rows || [], "Customer Query", "customer_support", "customer_name", "created_at")
    ];
    const list = dashboardScope === "travel"
      ? travelList
      : (dashboardScope === "food" ? foodList : supportList);
    return list
      .filter((n) => allowedPagesSet.has(n.pageKey))
      .filter((n) => !dismissedNotifs.has(`${n.type}:${n.id}`))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 50);
  }, [tablesByName, dismissedNotifs, dashboardScope, allowedPages, allowedPagesSet]);

  if (loadingSession) {
    return <div className="login-wrap"><div className="small">Checking admin session...</div></div>;
  }

  if (opsMode) {
    return (
      <div className="login-wrap">
        <div className="card">
          <h2 className="m-0">Ops!</h2>
          <div className="small mt-10">This dashboard is currently disabled by backend settings.</div>
          <div className="flex-gap10-wrap mt-12">
            <button className="btn primary" onClick={checkSession}><FaRedo /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <LoginView onSuccess={() => setAuthed(true)} dashboard={dashboardScope} />;
  }

  return (
    <div className={`layout unified-dashboard-window ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
        </button>
        <div className="sidebar-head">
          <div className="brand-mark" aria-hidden="true">EV</div>
          {!sidebarCollapsed ? (
            <div className="brand-block">
              <div className="brand">ExploreValley</div>
              <div className="brand-sub">{dashboardConfig.label}</div>
            </div>
          ) : null}
        </div>
        <div className="nav">
          {navGroups.map((group) => (
            <div key={group.id} className="nav-group">
              {!sidebarCollapsed ? <div className="nav-group-title">{group.label}</div> : <div className="nav-group-divider" aria-hidden="true" />}
              {group.items.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`nav-btn ${page === key ? "active" : ""}`}
                  onClick={() => setPage(key)}
                  title={sidebarCollapsed ? label : undefined}
                  data-tooltip={label}
                >
                  <Icon /> <span className="nav-label">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* Last item in the nav, below every page group. Logout used to live in
            the page header banner; that banner is gone, and this is the one
            control from it that had to survive. */}
        <div className="sidebar-foot">
          <button
            type="button"
            className="nav-btn nav-btn-logout"
            onClick={logout}
            title={sidebarCollapsed ? "Logout" : undefined}
            data-tooltip="Logout"
          >
            <FaSignOutAlt /> <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>
      <main className="main">
        {/* No header banner. It carried a title that duplicated the active
            side-nav item, a "Secure session" subtitle that told an operator
            nothing actionable, and the notification bell, Reload and Save All
            controls, all removed with it. Logout moved to the side-nav foot. */}

        <div className="content">
          {error ? <div className="warn">{error}</div> : null}

          {page === "dashboard" ? (
            <DashboardPage
              snapshot={snapshot}
              tablesByName={tablesByName}
              onReload={reload}
              onOpenImages={openImages}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
              onPatch={patchRow}
              DashboardView={DashboardView}
              ReviewsWidget={ReviewsWidget}
            />
          ) : page === "order_manager" ? (
            <OrderManagerPage
              snapshot={snapshot}
              tablesByName={tablesByName}
              onReload={reload}
              onOpenImages={openImages}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
              onPatch={patchRow}
              DashboardView={DashboardView}
            />
          ) : page === "customer_support" ? (
            <CustomerSupportPage
              EnquiriesWorkspace={EnquiriesWorkspace}
              table={tablesByName.get(TABLES.QUERIES)}
              onReload={reload}
              onOpenImages={openImages}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
            />
          ) : page === "gallery" ? (
            <GalleryPage GalleryWorkspace={GalleryWorkspace} />
          ) : page === "customers" ? (
            <CustomersPage CustomersWorkspace={CustomersWorkspace} snapshot={snapshot} />
          ) : page === "delivery" ? (
            <DeliveryPage DeliveryWorkspace={DeliveryWorkspace} snapshot={snapshot} onReload={reload} />
          ) : page === "delivery_pincodes" ? (
            <DeliveryPincodesPage
              DeliveryPincodesWorkspace={DeliveryPincodesWorkspace}
              snapshot={snapshot}
              TABLES={TABLES}
              onReload={reload}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
              onDelete={async (tableName, id, keyColumn, confirmText) => {
                await http("/api/admin/supabase/delete", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                });
              }}
            />
          ) : page === "ai_support" ? (
            <AISupportPage AISupportWorkspace={AISupportWorkspace} snapshot={snapshot} />
          ) : page === "refunds" ? (
            <RefundsPage RefundsWorkspace={RefundsWorkspace} snapshot={snapshot} onReload={reload} />
          ) : page === "notifications" ? (
            <NotificationsPage
              NotificationsWorkspace={NotificationsWorkspace}
              items={notificationItems}
              onOpen={(n) => {
                setDismissedNotifs((prev) => {
                  const next = new Set(prev);
                  next.add(`${n.type}:${n.id}`);
                  return next;
                });
                setPage(n.pageKey);
              }}
              onDismiss={(n) => {
                setDismissedNotifs((prev) => {
                  const next = new Set(prev);
                  next.add(`${n.type}:${n.id}`);
                  return next;
                });
              }}
            />
          ) : page === "pricing_controls" ? (
            <PricingControlsWorkspace
              snapshot={snapshot}
              onReload={reload}
              onUpsert={async (tableName, rows) => {
                await http("/api/admin/supabase/upsert", {
                  method: "POST",
                  body: JSON.stringify({ table: tableDb(tableName), rows })
                });
              }}
              TABLES={TABLES}
              isLikelyCottage={isLikelyCottage}
              safeJsonParse={safeJsonParse}
            />
          ) : (
            <>
              {page === "settings" ? (
                <SettingsPage
                  BotsAgentsCard={BotsAgentsCard}
                  ControlsPanel={() => (
                    <DashboardControlsWorkspace
                      snapshot={snapshot}
                      onReload={reload}
                      onUpsert={async (tableName, rows) => {
                        await http("/api/admin/supabase/upsert", {
                          method: "POST",
                          body: JSON.stringify({ table: tableDb(tableName), rows })
                        });
                      }}
                      TABLES={TABLES}
                      safeJsonParse={safeJsonParse}
                      http={http}
                      section="controls"
                    />
                  )}
                  UrlsPanel={() => (
                    <DashboardControlsWorkspace
                      snapshot={snapshot}
                      onReload={reload}
                      onUpsert={async (tableName, rows) => {
                        await http("/api/admin/supabase/upsert", {
                          method: "POST",
                          body: JSON.stringify({ table: tableDb(tableName), rows })
                        });
                      }}
                      TABLES={TABLES}
                      safeJsonParse={safeJsonParse}
                      http={http}
                      section="urls"
                    />
                  )}
                  TablesPanel={() => (
                    <DashboardControlsWorkspace
                      snapshot={snapshot}
                      onReload={reload}
                      onUpsert={async (tableName, rows) => {
                        await http("/api/admin/supabase/upsert", {
                          method: "POST",
                          body: JSON.stringify({ table: tableDb(tableName), rows })
                        });
                      }}
                      TABLES={TABLES}
                      safeJsonParse={safeJsonParse}
                      http={http}
                      section="tables"
                    />
                  )}
                  UsersPanel={() => (
                    <DashboardUsersWorkspace
                      http={http}
                    />
                  )}
                />
              ) : null}
              {page === "food_vendors" ? (
                <FoodVendorsPage
                  FoodVendorsWorkspace={FoodVendorsWorkspace}
                  snapshot={snapshot}
                  onReload={reload}
                  onOpenImages={openImages}
                  TABLES={TABLES}
                  PAGE_SIZE={PAGE_SIZE}
                  Pagination={Pagination}
                  safeText={safeText}
                  extractImageUrlsFromRow={extractImageUrlsFromRow}
                  adminApiForm={adminApiForm}
                  http={http}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onUpsertPartial={upsertPartial}
                  onPatch={patchRow}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "mart_catalog" ? (
                <MartsProductsPage
                  MartCatalogWorkspace={MartCatalogWorkspace}
                  snapshot={snapshot}
                  onReload={reload}
                  TABLES={TABLES}
                  PAGE_SIZE={PAGE_SIZE}
                  Pagination={Pagination}
                  safeText={safeText}
                  safeJsonParse={safeJsonParse}
                  adminApiForm={adminApiForm}
                  http={http}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "mart_vendor_admin" ? (
                <MartVendorAdminWorkspace
                  http={http}
                  onHeaderContentChange={setMartVendorHeaderContent}
                  onOpenCategoryImages={dashboardScope === "food" ? () => setCategoryImagesOpen(true) : undefined}
                />
              ) : page === "duty_services" ? (
                <DutyServicesWorkspace
                  snapshot={snapshot}
                  TABLES={TABLES}
                  onReload={reload}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "ad_banners" ? (
                <AdsPromosWorkspace
                  snapshot={snapshot}
                  onReload={reload}
                  adminApiForm={adminApiForm}
                  onPatch={patchRow}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "duty_requests" ? (
                <DutyRequestsWorkspace
                  snapshot={snapshot}
                  TABLES={TABLES}
                  onReload={reload}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                />
              ) : page === "credential_manager" ? (
                <MartsProductsPage
                  MartCatalogWorkspace={MartCatalogWorkspace}
                  viewMode="credentials"
                  snapshot={snapshot}
                  onReload={reload}
                  TABLES={TABLES}
                  PAGE_SIZE={PAGE_SIZE}
                  Pagination={Pagination}
                  safeText={safeText}
                  safeJsonParse={safeJsonParse}
                  adminApiForm={adminApiForm}
                  http={http}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                  onDelete={async (tableName, id, keyColumn, confirmText) => {
                    await http("/api/admin/supabase/delete", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                    });
                  }}
                />
              ) : page === "category_icons" ? (
                <CategoryIconsPage
                  FoodCategoryIconsWorkspace={FoodCategoryIconsWorkspace}
                  snapshot={snapshot}
                  onReload={reload}
                  TABLES={TABLES}
                  adminApiForm={adminApiForm}
                  onPatch={patchRow}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                />
              ) : page === "food_menu_icons" ? (
                <FoodMenuIconsPage
                  FoodMenuIconsWorkspace={FoodMenuIconsWorkspace}
                  snapshot={snapshot}
                  onReload={reload}
                  TABLES={TABLES}
                  onPatch={patchRow}
                  onUpsert={async (tableName, rows) => {
                    await http("/api/admin/supabase/upsert", {
                      method: "POST",
                      body: JSON.stringify({ table: tableDb(tableName), rows })
                    });
                  }}
                />
              ) : (
                <>
              {[
                "explorevalley",
                "tours",
                "hotels",
                "cottages",
                "cab_providers",
                "bike_rentals",
                "buses",
                "orders",
                "tracking",
                "analytics",
                "settings"
              ].includes(page) ? null : null}
              {page === "explorevalley" ? <ExploreValleyPage /> : null}
              {page === "tours" ? <ToursPage /> : null}
              {page === "hotels" ? <HotelsPage /> : null}
              {page === "cottages" ? <CottagesPage /> : null}
              {page === "cab_providers" ? (
                <CabProvidersPage
                  snapshot={snapshot}
                  onReload={reload}
                  TABLES={TABLES}
                  http={http}
                />
              ) : null}
              {page === "bike_rentals" ? <BikeRentalsPage /> : null}
              {page === "buses" ? <BusesPage /> : null}
              {page === "orders" ? <OrdersPage /> : null}
              {page === "invoices" ? <InvoicesPage
                PricingControlsWorkspace={PricingControlsWorkspace}
                snapshot={snapshot}
                onReload={reload}
                onUpsert={async (tableName, rows) => {
                  await http("/api/admin/supabase/upsert", {
                    method: "POST",
                    body: JSON.stringify({ table: tableDb(tableName), rows })
                  });
                }}
                TABLES={TABLES}
                isLikelyCottage={isLikelyCottage}
                safeJsonParse={safeJsonParse}
              /> : null}
              {page === "tracking" ? <TrackingPage /> : null}
              {page === "analytics" ? <AnalyticsPage tablesByName={tablesByName} dashboardScope={dashboardScope} /> : null}
              {page !== "cab_providers" && page !== "settings" && page !== "invoices" ? <DataCrudPage
                page={page}
                currentTables={currentTables}
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                tab={tab}
                setTab={setTab}
                effectiveTable={effectiveTable}
                search={search}
                setSearch={setSearch}
                filteredRows={filteredRows}
                setSelectedRowKey={setSelectedRowKey}
                activeTable={activeTable}
                tablePage={tablePage}
                setTablePage={setTablePage}
                selectedRow={selectedRow}
                saveForm={saveForm}
                openImages={openImages}
                upsertPartial={upsertPartial}
                catalogLookup={catalogLookup}
                jsonDraft={jsonDraft}
                setJsonDraft={setJsonDraft}
                saveJson={saveJson}
                tableLabel={tableLabel}
                tableDb={tableDb}
                columnLabel={columnLabel}
                keyCol={keyCol}
                firstDisplayCol={firstDisplayCol}
                hasImages={hasImages}
                orderedCols={orderedCols}
                displayText={displayText}
                extractImageUrlsFromRow={extractImageUrlsFromRow}
                TABLES={TABLES}
                CabRatesTable={CabRatesTable}
                BikeRentalsTable={BikeRentalsTable}
                BusesTable={BusesTable}
                BookingsTable={BookingsTable}
                CabBookingsTable={CabBookingsTable}
                BikeBookingsTable={BikeBookingsTable}
                TrackingTable={TrackingTable}
                cabRatesById={cabRatesById}
                FormEditor={FormEditor}
                formEditorExtras={{
                  TABLES,
                  BucketLibraryModal,
                  tableLabel,
                  columnLabel,
                  extractImageUrlsFromRow,
                  keyColumnForTable,
                  makeUuid,
                  normalizeStringList,
                  safeJsonParse,
                  safeText,
                  uniqStrings,
                  adminApiForm
                }}
                Pagination={Pagination}
                onUpsert={async (tableName, rows) => {
                  await http("/api/admin/supabase/upsert", {
                    method: "POST",
                    body: JSON.stringify({ table: tableDb(tableName), rows })
                  });
                }}
                onPatch={patchRow}
                onDelete={async (tableName, id, keyColumn, confirmText) => {
                  await http("/api/admin/supabase/delete", {
                    method: "POST",
                    body: JSON.stringify({ table: tableDb(tableName), id, keyColumn, confirmText })
                  });
                }}
                onReload={reload}
                tableOnlyMode={
                  dashboardScope === "travel" &&
                  !["tours", "hotels", "cottages"].includes(page)
                }
              /> : null}
                </>
              )}
            </>
          )}
        </div>
      </main>
      {lightbox.open ? (
        <ImageLightbox
          title={lightbox.title}
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox({ open: false, title: "", urls: [], index: 0 })}
          onPick={(i) => setLightbox((p) => ({ ...p, index: i }))}
        />
      ) : null}
      {categoryImagesOpen ? (
        <div className="ev-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setCategoryImagesOpen(false); }}>
          <div className="ev-dialog" role="dialog" aria-modal="true" aria-labelledby="ev-dialog-cat-title">
            <div className="ev-dialog-head">
              <div className="ev-dialog-title" id="ev-dialog-cat-title">
                <FaImages /> Category Images
              </div>
              <button type="button" className="ev-dialog-close" onClick={() => setCategoryImagesOpen(false)} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <div className="ev-dialog-body">
              <FoodCategoryIconsWorkspace
                snapshot={snapshot}
                onReload={reload}
                TABLES={TABLES}
                adminApiForm={adminApiForm}
                onUpsert={async (tableName, rows) => {
                  await http("/api/admin/supabase/upsert", {
                    method: "POST",
                    body: JSON.stringify({ table: tableDb(tableName), rows })
                  });
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);

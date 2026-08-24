import React, { useEffect, useMemo, useState } from "react";
import { FaBicycle, FaBuilding, FaCar, FaHome, FaHotel, FaRedo, FaSave, FaStore, FaSuitcase, FaTaxi, FaUtensils } from "react-icons/fa";

const INVOICE_SERVICE_OPTIONS = [
  { key: "default", profileKey: "default", label: "Default", icon: <FaBuilding /> },
  { key: "stay", profileKey: "stay", label: "Stay (Legacy)", icon: <FaSuitcase /> },
  { key: "hotel", profileKey: "hotel", label: "Hotel", icon: <FaHotel /> },
  { key: "cottage", profileKey: "cottage", label: "Cottage", icon: <FaHome /> },
  { key: "tour", profileKey: "tour", label: "Tour", icon: <FaStore /> },
  { key: "taxi", profileKey: "cab", label: "Taxi", icon: <FaTaxi /> },
  { key: "bike", profileKey: "bike", label: "Bike", icon: <FaBicycle /> },
  { key: "food", profileKey: "food", label: "Food", icon: <FaUtensils /> },
  { key: "mart", profileKey: "mart", label: "Mart", icon: <FaCar /> }
];

function emptyServiceProfile() {
  return {
    selectedEntityRef: "",
    brandName: "",
    logoUrl: "",
    sellerName: "",
    sellerAddress: "",
    gstin: "",
    fssai: "",
    cin: "",
    pan: "",
    placeOfSupply: "",
    supportEmail: "",
    supportPhone: "",
    authorizedSignatory: "",
    defaultHsnOrSac: "",
    defaultGstPercent: ""
  };
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function normalizeEntityProfile(row) {
  const r = row && typeof row === "object" ? row : {};
  return {
    brandName: firstNonEmpty(r.brandName, r.brand_name),
    logoUrl: firstNonEmpty(r.logoUrl, r.logo_url, r.logo, r.image, r.image_url),
    sellerName: firstNonEmpty(
      r.sellerName,
      r.seller_name,
      r.legal_name,
      r.legalName,
      r.vendor_name,
      r.vendorName,
      r.provider_name,
      r.providerName,
      r.store_name,
      r.storeName,
      r.hotel_name,
      r.hotelName,
      r.tour_name,
      r.tourName,
      r.driver_name,
      r.driverName,
      r.name,
      [firstNonEmpty(r.first_name, r.firstName), firstNonEmpty(r.last_name, r.lastName)].filter(Boolean).join(" ")
    ),
    sellerAddress: firstNonEmpty(r.sellerAddress, r.seller_address, r.address, r.location, r.full_address, r.fullAddress),
    gstin: firstNonEmpty(r.gstin, r.gst_no, r.gst_number, r.gstNumber),
    fssai: firstNonEmpty(r.fssai, r.fssai_license, r.fssaiLicense),
    cin: firstNonEmpty(r.cin),
    pan: firstNonEmpty(r.pan),
    placeOfSupply: firstNonEmpty(r.place_of_supply, r.placeOfSupply, r.state, r.city),
    supportEmail: firstNonEmpty(r.support_email, r.supportEmail, r.email, r.contact_email, r.contactEmail),
    supportPhone: firstNonEmpty(r.support_phone, r.supportPhone, r.phone, r.contact_phone, r.contactPhone, r.mobile),
    authorizedSignatory: firstNonEmpty(r.authorizedSignatory, r.authorized_signatory),
    defaultHsnOrSac: firstNonEmpty(r.defaultHsnOrSac, r.default_hsn_or_sac, r.hsn, r.sac),
    defaultGstPercent: firstNonEmpty(r.defaultGstPercent, r.default_gst_percent, r.gstPercent, r.gst_percent)
  };
}

function optionFromEntity(kindLabel, row) {
  const r = row && typeof row === "object" ? row : {};
  const rowId = String(r.id || "").trim();
  if (!rowId) return null;
  const profile = normalizeEntityProfile(r);
  const displayName = firstNonEmpty(profile.sellerName, rowId);
  return {
    value: `${kindLabel}:${rowId}`,
    label: `${kindLabel}: ${displayName}`,
    profile
  };
}

function getRowPriceValue(row, safeJsonParse) {
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

function withUpdatedRowPrice(row, nextPrice, safeJsonParse) {
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
export default function PricingControlsWorkspace({
  snapshot,
  onReload,
  onUpsert,
  TABLES,
  isLikelyCottage,
  safeJsonParse,
  invoiceOnly = false,
  invoiceService = "",
  onInvoiceServiceChange = null,
  showInvoiceServiceTabs = true,
  invoiceViewLabel = ""
}) {
  const byName = useMemo(() => new Map((snapshot?.tables || []).map((t) => [t.name, t])), [snapshot?.generatedAt]);
  const settingsRow = useMemo(() => {
    const rows = byName.get(TABLES.SETTINGS)?.rows || [];
    return Array.isArray(rows) && rows[0] ? rows[0] : { id: "main", currency: "INR", tax_rules: {}, pricing_tiers: [], page_slugs: {} };
  }, [byName, TABLES.SETTINGS]);
  const groups = useMemo(() => ([
    { key: "tours", label: "Tours", table: TABLES.TOURS, rows: byName.get(TABLES.TOURS)?.rows || [] },
    { key: "hotels", label: "Hotels", table: TABLES.HOTELS, rows: (byName.get(TABLES.HOTELS)?.rows || []).filter((r) => !isLikelyCottage(r)) },
    { key: "cottages", label: "Cottages", table: TABLES.HOTELS, rows: (byName.get(TABLES.HOTELS)?.rows || []).filter((r) => isLikelyCottage(r)) },
    { key: "cab", label: "Cab Rates", table: TABLES.CAB_PROVIDERS, rows: byName.get(TABLES.CAB_PROVIDERS)?.rows || [] },
    { key: "bike", label: "Bike Rentals", table: TABLES.BIKE_RENTALS, rows: byName.get(TABLES.BIKE_RENTALS)?.rows || [] }
  ]), [byName]);
  const [activeGroup, setActiveGroup] = useState("tours");
  const [adjustPct, setAdjustPct] = useState("0");
  const [gstPct, setGstPct] = useState("5");
  const [reason, setReason] = useState("");
  const [basePrice, setBasePrice] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [invoiceProfile, setInvoiceProfile] = useState({
    brandName: "ExploreValley",
    logoUrl: "",
    sellerName: "ExploreValley Pvt Ltd",
    sellerAddress: "",
    gstin: "",
    fssai: "",
    cin: "",
    pan: "",
    placeOfSupply: "",
    supportEmail: "",
    supportPhone: "",
    authorizedSignatory: "Authorised Signatory",
    defaultHsnOrSac: "9964",
    defaultGstPercent: "5",
    termsText: "",
    serviceProfiles: {}
  });
  const [activeInvoiceService, setActiveInvoiceService] = useState(String(invoiceService || "default"));

  useEffect(() => {
    const next = String(invoiceService || "").trim();
    if (!next) return;
    setActiveInvoiceService(next);
  }, [invoiceService]);

  const pct = Number(adjustPct || 0);
  const gst = Number(gstPct || 0);
  const base = Number(basePrice || 0);
  const afterAdjust = base + (base * (Number.isNaN(pct) ? 0 : pct) / 100);
  const customer = afterAdjust + (afterAdjust * (Number.isNaN(gst) ? 0 : gst) / 100);
  const active = groups.find((g) => g.key === activeGroup) || groups[0];

  useEffect(() => {
    const taxRules = (settingsRow?.tax_rules && typeof settingsRow.tax_rules === "object")
      ? settingsRow.tax_rules
      : (safeJsonParse(settingsRow?.tax_rules || "") || {});
    const invoice = (taxRules?.invoice && typeof taxRules.invoice === "object") ? taxRules.invoice : {};
    const terms = Array.isArray(invoice?.terms) ? invoice.terms : [];
    const serviceProfilesRaw = (invoice?.serviceProfiles && typeof invoice.serviceProfiles === "object")
      ? invoice.serviceProfiles
      : ((invoice?.service_profiles && typeof invoice.service_profiles === "object") ? invoice.service_profiles : {});
    const normalizedServiceProfiles = Object.fromEntries(
      Object.entries(serviceProfilesRaw).map(([k, v]) => {
        const x = (v && typeof v === "object") ? v : {};
        return [k, {
          ...emptyServiceProfile(),
          selectedEntityRef: String(x?.selectedEntityRef || ""),
          brandName: String(x?.brandName || ""),
          logoUrl: String(x?.logoUrl || ""),
          sellerName: String(x?.sellerName || ""),
          sellerAddress: String(x?.sellerAddress || ""),
          gstin: String(x?.gstin || ""),
          fssai: String(x?.fssai || ""),
          cin: String(x?.cin || ""),
          pan: String(x?.pan || ""),
          placeOfSupply: String(x?.placeOfSupply || ""),
          supportEmail: String(x?.supportEmail || ""),
          supportPhone: String(x?.supportPhone || ""),
          authorizedSignatory: String(x?.authorizedSignatory || ""),
          defaultHsnOrSac: String(x?.defaultHsnOrSac || ""),
          defaultGstPercent: String(x?.defaultGstPercent ?? "")
        }];
      })
    );
    setInvoiceProfile({
      brandName: String(invoice?.brandName || "ExploreValley"),
      logoUrl: String(invoice?.logoUrl || ""),
      sellerName: String(invoice?.sellerName || "ExploreValley Pvt Ltd"),
      sellerAddress: String(invoice?.sellerAddress || ""),
      gstin: String(invoice?.gstin || ""),
      fssai: String(invoice?.fssai || ""),
      cin: String(invoice?.cin || ""),
      pan: String(invoice?.pan || ""),
      placeOfSupply: String(invoice?.placeOfSupply || ""),
      supportEmail: String(invoice?.supportEmail || ""),
      supportPhone: String(invoice?.supportPhone || ""),
      authorizedSignatory: String(invoice?.authorizedSignatory || "Authorised Signatory"),
      defaultHsnOrSac: String(invoice?.defaultHsnOrSac || "9964"),
      defaultGstPercent: String(invoice?.defaultGstPercent ?? "5"),
      termsText: terms.length ? terms.join("\n") : "",
      serviceProfiles: normalizedServiceProfiles
    });
  }, [settingsRow, safeJsonParse]);

  const activeServiceProfile = useMemo(() => {
    const activeOption = INVOICE_SERVICE_OPTIONS.find((x) => x.key === activeInvoiceService) || INVOICE_SERVICE_OPTIONS[0];
    const profileKey = activeOption?.profileKey || activeInvoiceService;
    const map = (invoiceProfile?.serviceProfiles && typeof invoiceProfile.serviceProfiles === "object")
      ? invoiceProfile.serviceProfiles
      : {};
    const cur = (map?.[profileKey] && typeof map[profileKey] === "object")
      ? map[profileKey]
      : {};
    return {
      ...emptyServiceProfile(),
      ...cur
    };
  }, [invoiceProfile, activeInvoiceService]);

  const activeInvoiceProfileKey = useMemo(() => {
    const activeOption = INVOICE_SERVICE_OPTIONS.find((x) => x.key === activeInvoiceService) || INVOICE_SERVICE_OPTIONS[0];
    return activeOption?.profileKey || activeInvoiceService;
  }, [activeInvoiceService]);
  const activeInvoiceServiceOption = useMemo(
    () => INVOICE_SERVICE_OPTIONS.find((x) => x.key === activeInvoiceService) || INVOICE_SERVICE_OPTIONS[0],
    [activeInvoiceService]
  );

  const entityOptionsByService = useMemo(() => {
    const toursRows = byName.get(TABLES.TOURS)?.rows || [];
    const hotelsRows = byName.get(TABLES.HOTELS)?.rows || [];
    const hotelRows = hotelsRows.filter((r) => !isLikelyCottage(r));
    const cottageRows = hotelsRows.filter((r) => isLikelyCottage(r));
    const restaurantRows = byName.get(TABLES.RESTAURANTS)?.rows || [];
    const martRows = byName.get(TABLES.MARTS)?.rows || [];
    const cabProviderRows = byName.get(TABLES.CAB_PROVIDERS)?.rows || [];
    const bikeRows = byName.get(TABLES.BIKE_RENTALS)?.rows || [];
    const driverRows = byName.get(TABLES.DRIVERS)?.rows || [];

    return {
      default: [],
      stay: [...hotelRows, ...cottageRows].map((r) => optionFromEntity("Property", r)).filter(Boolean),
      hotel: hotelRows.map((r) => optionFromEntity("Property", r)).filter(Boolean),
      cottage: cottageRows.map((r) => optionFromEntity("Property", r)).filter(Boolean),
      tour: toursRows.map((r) => optionFromEntity("Vendor", r)).filter(Boolean),
      food: restaurantRows.map((r) => optionFromEntity("Vendor", r)).filter(Boolean),
      mart: martRows.map((r) => optionFromEntity("Vendor", r)).filter(Boolean),
      cab: [...cabProviderRows.map((r) => optionFromEntity("Vendor", r)), ...driverRows.map((r) => optionFromEntity("Driver", r))].filter(Boolean),
      taxi: [...cabProviderRows.map((r) => optionFromEntity("Vendor", r)), ...driverRows.map((r) => optionFromEntity("Driver", r))].filter(Boolean),
      bike: [...bikeRows.map((r) => optionFromEntity("Vendor", r)), ...driverRows.map((r) => optionFromEntity("Driver", r))].filter(Boolean)
    };
  }, [byName, TABLES, isLikelyCottage]);

  const activeEntityOptions = entityOptionsByService?.[activeInvoiceService] || [];
  const isCategoryInvoiceView = !!String(invoiceViewLabel || "").trim();
  const computedInvoiceTitle = String(invoiceViewLabel || "").trim()
    ? `${String(invoiceViewLabel).trim()} Invoice Settings`
    : "Invoice Profile (Settings)";
  const computedInvoiceSubtitle = String(invoiceViewLabel || "").trim()
    ? `Manage invoice details for ${String(invoiceViewLabel).trim()} category.`
    : "Configure seller and tax-invoice information used in PDF invoices.";

  const updateActiveServiceField = (field, value) => {
    setInvoiceProfile((p) => {
      const currentMap = (p?.serviceProfiles && typeof p.serviceProfiles === "object")
        ? p.serviceProfiles
        : {};
      const currentService = (currentMap?.[activeInvoiceProfileKey] && typeof currentMap[activeInvoiceProfileKey] === "object")
        ? currentMap[activeInvoiceProfileKey]
        : emptyServiceProfile();
      return {
        ...p,
        serviceProfiles: {
          ...currentMap,
          [activeInvoiceProfileKey]: {
            ...currentService,
            [field]: value
          }
        }
      };
    });
  };

  const applyPricing = async () => {
    if (!active || !active.rows.length) {
      setMsg("No rows available for selected category.");
      return;
    }
    const factor = 1 + ((Number.isNaN(pct) ? 0 : pct) / 100);
    const gstFactor = 1 + ((Number.isNaN(gst) ? 0 : gst) / 100);
    const updated = active.rows.map((row) => {
      const current = getRowPriceValue(row, safeJsonParse);
      if (current === null) return row;
      const next = Math.round(current * factor * gstFactor * 100) / 100;
      const out = withUpdatedRowPrice(row, next, safeJsonParse);
      out.price_dropped = pct < 0;
      out.price_drop_percent = pct < 0 ? Math.abs(pct) : 0;
      if (reason.trim()) out.additional_comments = reason.trim();
      return out;
    });
    setBusy(true);
    setMsg("");
    try {
      await onUpsert(active.table, updated);
      await onReload();
      setMsg(`Saved pricing for ${active.label}.`);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveInvoiceProfile = async () => {
    const existingTaxRules = (settingsRow?.tax_rules && typeof settingsRow.tax_rules === "object")
      ? settingsRow.tax_rules
      : (safeJsonParse(settingsRow?.tax_rules || "") || {});
    const terms = String(invoiceProfile.termsText || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const invoice = {
      brandName: String(invoiceProfile.brandName || ""),
      logoUrl: String(invoiceProfile.logoUrl || ""),
      sellerName: String(invoiceProfile.sellerName || ""),
      sellerAddress: String(invoiceProfile.sellerAddress || ""),
      gstin: String(invoiceProfile.gstin || ""),
      fssai: String(invoiceProfile.fssai || ""),
      cin: String(invoiceProfile.cin || ""),
      pan: String(invoiceProfile.pan || ""),
      placeOfSupply: String(invoiceProfile.placeOfSupply || ""),
      supportEmail: String(invoiceProfile.supportEmail || ""),
      supportPhone: String(invoiceProfile.supportPhone || ""),
      authorizedSignatory: String(invoiceProfile.authorizedSignatory || ""),
      defaultHsnOrSac: String(invoiceProfile.defaultHsnOrSac || "9964"),
      defaultGstPercent: Number(invoiceProfile.defaultGstPercent || 5),
      terms,
      serviceProfiles: Object.fromEntries(
        Object.entries((invoiceProfile?.serviceProfiles && typeof invoiceProfile.serviceProfiles === "object")
          ? invoiceProfile.serviceProfiles
          : {}
        ).map(([k, v]) => {
          const x = (v && typeof v === "object") ? v : {};
          return [k, {
            selectedEntityRef: String(x?.selectedEntityRef || ""),
            brandName: String(x?.brandName || ""),
            logoUrl: String(x?.logoUrl || ""),
            sellerName: String(x?.sellerName || ""),
            sellerAddress: String(x?.sellerAddress || ""),
            gstin: String(x?.gstin || ""),
            fssai: String(x?.fssai || ""),
            cin: String(x?.cin || ""),
            pan: String(x?.pan || ""),
            placeOfSupply: String(x?.placeOfSupply || ""),
            supportEmail: String(x?.supportEmail || ""),
            supportPhone: String(x?.supportPhone || ""),
            authorizedSignatory: String(x?.authorizedSignatory || ""),
            defaultHsnOrSac: String(x?.defaultHsnOrSac || ""),
            defaultGstPercent: x?.defaultGstPercent === "" ? "" : Number(x?.defaultGstPercent || 0)
          }];
        })
      )
    };
    const row = {
      ...settingsRow,
      id: settingsRow?.id || "main",
      tax_rules: {
        ...(existingTaxRules || {}),
        invoice
      }
    };
    setBusy(true);
    setMsg("");
    try {
      await onUpsert(TABLES.SETTINGS, [row]);
      await onReload();
      setMsg("Saved invoice profile in Settings.");
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pricing-wrap">
      {!invoiceOnly ? (
      <div className="pricing-card">
        <h3 className="m-0">ExploreValley Pricing Controls</h3>
        <div className="small mt-8">Set global price adjustment and GST. Customer pricing = base value +/- adjustment + GST.</div>
        <div className="tabs mt-10">
          {groups.map((g) => (
            <button key={g.key} className={`tab ${activeGroup === g.key ? "active" : ""}`} onClick={() => setActiveGroup(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="form-grid mt-10">
          <div className="field">
            <label>Price Adjustment (%)</label>
            <input className="input" type="number" value={adjustPct} onChange={(e) => setAdjustPct(e.target.value)} />
          </div>
          <div className="field">
            <label>GST (%)</label>
            <input className="input" type="number" value={gstPct} onChange={(e) => setGstPct(e.target.value)} />
          </div>
          <div className="field full">
            <label>Reason (optional)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this price update was applied" />
          </div>
        </div>

        <div className="pricing-preview mt-10">
          <div className="small mb-6">Base vs Customer Price Preview</div>
          <div className="form-grid">
            <div className="field">
              <label>Base Price (INR)</label>
              <input className="input" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div className="field">
              <label>Customer Price (INR)</label>
              <input className="input" readOnly value={Number.isFinite(customer) ? Math.round(customer).toLocaleString("en-IN") : "0"} />
            </div>
          </div>
          <div className="small mt-8">
            Base: INR {Number.isFinite(base) ? Math.round(base).toLocaleString("en-IN") : 0} {"->"} After {pct || 0}%: INR {Number.isFinite(afterAdjust) ? Math.round(afterAdjust).toLocaleString("en-IN") : 0} {"->"} After GST {gst || 0}%: INR {Number.isFinite(customer) ? Math.round(customer).toLocaleString("en-IN") : 0}
          </div>
        </div>

        <div className="flex-gap10-wrap mt-12">
          <button className="btn primary" onClick={applyPricing} disabled={busy}><FaSave /> {busy ? "Saving..." : "Save Pricing Config"}</button>
          <button className="btn" onClick={onReload} disabled={busy}><FaRedo /> Reload Config</button>
        </div>
        {msg ? <div className="small mt-10">{msg}</div> : <div className="small mt-10">Loaded from Supabase settings.</div>}
      </div>
      ) : null}

      <div className={`pricing-card invoice-shell ${invoiceOnly ? "mt-0" : "mt-12"}`}>
        <div className="invoice-head">
          <div>
            <h3 className="m-0">{computedInvoiceTitle}</h3>
            <div className="small mt-8">{computedInvoiceSubtitle}</div>
          </div>
          <div className="invoice-meta-pills">
            <span className="invoice-pill">Categories {INVOICE_SERVICE_OPTIONS.length}</span>
            <span className="invoice-pill">Profile {activeInvoiceProfileKey}</span>
            <span className="invoice-pill">Selected {activeInvoiceServiceOption?.label || activeInvoiceService}</span>
          </div>
        </div>
        {!isCategoryInvoiceView ? (
          <>
            <div className="form-grid mt-10">
              <div className="field">
                <label>Brand Name</label>
                <input className="input" value={invoiceProfile.brandName} onChange={(e) => setInvoiceProfile((p) => ({ ...p, brandName: e.target.value }))} />
              </div>
              <div className="field">
                <label>Logo URL</label>
                <input className="input" value={invoiceProfile.logoUrl} onChange={(e) => setInvoiceProfile((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="field">
                <label>Seller Legal Name</label>
                <input className="input" value={invoiceProfile.sellerName} onChange={(e) => setInvoiceProfile((p) => ({ ...p, sellerName: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Seller Address</label>
                <textarea className="textarea" value={invoiceProfile.sellerAddress} onChange={(e) => setInvoiceProfile((p) => ({ ...p, sellerAddress: e.target.value }))} />
              </div>
              <div className="field">
                <label>GSTIN</label>
                <input className="input" value={invoiceProfile.gstin} onChange={(e) => setInvoiceProfile((p) => ({ ...p, gstin: e.target.value }))} />
              </div>
              <div className="field">
                <label>FSSAI</label>
                <input className="input" value={invoiceProfile.fssai} onChange={(e) => setInvoiceProfile((p) => ({ ...p, fssai: e.target.value }))} />
              </div>
              <div className="field">
                <label>CIN</label>
                <input className="input" value={invoiceProfile.cin} onChange={(e) => setInvoiceProfile((p) => ({ ...p, cin: e.target.value }))} />
              </div>
              <div className="field">
                <label>PAN</label>
                <input className="input" value={invoiceProfile.pan} onChange={(e) => setInvoiceProfile((p) => ({ ...p, pan: e.target.value }))} />
              </div>
              <div className="field">
                <label>Place Of Supply</label>
                <input className="input" value={invoiceProfile.placeOfSupply} onChange={(e) => setInvoiceProfile((p) => ({ ...p, placeOfSupply: e.target.value }))} />
              </div>
              <div className="field">
                <label>Default HSN/SAC</label>
                <input className="input" value={invoiceProfile.defaultHsnOrSac} onChange={(e) => setInvoiceProfile((p) => ({ ...p, defaultHsnOrSac: e.target.value }))} />
              </div>
              <div className="field">
                <label>Default GST (%)</label>
                <input className="input" type="number" value={invoiceProfile.defaultGstPercent} onChange={(e) => setInvoiceProfile((p) => ({ ...p, defaultGstPercent: e.target.value }))} />
              </div>
              <div className="field">
                <label>Support Email</label>
                <input className="input" value={invoiceProfile.supportEmail} onChange={(e) => setInvoiceProfile((p) => ({ ...p, supportEmail: e.target.value }))} />
              </div>
              <div className="field">
                <label>Support Phone</label>
                <input className="input" value={invoiceProfile.supportPhone} onChange={(e) => setInvoiceProfile((p) => ({ ...p, supportPhone: e.target.value }))} />
              </div>
              <div className="field">
                <label>Authorised Signatory</label>
                <input className="input" value={invoiceProfile.authorizedSignatory} onChange={(e) => setInvoiceProfile((p) => ({ ...p, authorizedSignatory: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Terms (one line per item)</label>
                <textarea className="textarea" value={invoiceProfile.termsText} onChange={(e) => setInvoiceProfile((p) => ({ ...p, termsText: e.target.value }))} />
              </div>
            </div>
            <div className="small mt-12">Service-wise Seller Profile Overrides (used per invoice category)</div>
          </>
        ) : (
          <div className="small mt-12">This section edits only <strong>{activeInvoiceServiceOption?.label || activeInvoiceService}</strong> invoice profile data.</div>
        )}
        {showInvoiceServiceTabs ? (
          <div className="invoice-service-tabs mt-10">
            {INVOICE_SERVICE_OPTIONS.map((s) => (
              <button
                key={s.key}
                className={`invoice-service-tab ${activeInvoiceService === s.key ? "active" : ""}`}
                onClick={() => {
                  setActiveInvoiceService(s.key);
                  if (typeof onInvoiceServiceChange === "function") onInvoiceServiceChange(s.key);
                }}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        {activeEntityOptions.length ? (
          <div className="form-grid mt-10">
            <div className="field full">
              <label>
                Pick From Existing {["hotel", "cottage", "stay"].includes(activeInvoiceService)
                  ? "Properties"
                  : (activeInvoiceService === "taxi" || activeInvoiceService === "bike" ? "Vendors/Drivers" : "Vendors")}
              </label>
              <select
                className="input"
                value={activeServiceProfile.selectedEntityRef}
                onChange={(e) => {
                  const val = e.target.value;
                  const chosen = activeEntityOptions.find((x) => x.value === val);
                  if (!chosen) {
                    updateActiveServiceField("selectedEntityRef", "");
                    return;
                  }
                  setInvoiceProfile((p) => {
                    const currentMap = (p?.serviceProfiles && typeof p.serviceProfiles === "object") ? p.serviceProfiles : {};
                    const prev = (currentMap?.[activeInvoiceProfileKey] && typeof currentMap[activeInvoiceProfileKey] === "object")
                      ? currentMap[activeInvoiceProfileKey]
                      : emptyServiceProfile();
                    return {
                      ...p,
                      serviceProfiles: {
                        ...currentMap,
                        [activeInvoiceProfileKey]: {
                          ...prev,
                          selectedEntityRef: val,
                          ...chosen.profile
                        }
                      }
                    };
                  });
                }}
              >
                <option value="">Select from background data</option>
                {activeEntityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <div className="small mt-8">{isCategoryInvoiceView ? "Fields are saved for this selected category only." : "Leave fields empty to fallback to the main Invoice Profile above."}</div>
        <div className="form-grid mt-10">
          <div className="field">
            <label>{isCategoryInvoiceView ? "Brand Name" : "Brand Name (Override)"}</label>
            <input className="input" value={activeServiceProfile.brandName} onChange={(e) => updateActiveServiceField("brandName", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Logo URL" : "Logo URL (Override)"}</label>
            <input className="input" value={activeServiceProfile.logoUrl} onChange={(e) => updateActiveServiceField("logoUrl", e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Seller Legal Name" : "Seller Legal Name (Override)"}</label>
            <input className="input" value={activeServiceProfile.sellerName} onChange={(e) => updateActiveServiceField("sellerName", e.target.value)} />
          </div>
          <div className="field full">
            <label>{isCategoryInvoiceView ? "Seller Address" : "Seller Address (Override)"}</label>
            <textarea className="textarea" value={activeServiceProfile.sellerAddress} onChange={(e) => updateActiveServiceField("sellerAddress", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "GSTIN" : "GSTIN (Override)"}</label>
            <input className="input" value={activeServiceProfile.gstin} onChange={(e) => updateActiveServiceField("gstin", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "FSSAI" : "FSSAI (Override)"}</label>
            <input className="input" value={activeServiceProfile.fssai} onChange={(e) => updateActiveServiceField("fssai", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "CIN" : "CIN (Override)"}</label>
            <input className="input" value={activeServiceProfile.cin} onChange={(e) => updateActiveServiceField("cin", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "PAN" : "PAN (Override)"}</label>
            <input className="input" value={activeServiceProfile.pan} onChange={(e) => updateActiveServiceField("pan", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Place Of Supply" : "Place Of Supply (Override)"}</label>
            <input className="input" value={activeServiceProfile.placeOfSupply} onChange={(e) => updateActiveServiceField("placeOfSupply", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Default HSN/SAC" : "Default HSN/SAC (Override)"}</label>
            <input className="input" value={activeServiceProfile.defaultHsnOrSac} onChange={(e) => updateActiveServiceField("defaultHsnOrSac", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Default GST (%)" : "Default GST (%) (Override)"}</label>
            <input className="input" type="number" value={activeServiceProfile.defaultGstPercent} onChange={(e) => updateActiveServiceField("defaultGstPercent", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Support Email" : "Support Email (Override)"}</label>
            <input className="input" value={activeServiceProfile.supportEmail} onChange={(e) => updateActiveServiceField("supportEmail", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Support Phone" : "Support Phone (Override)"}</label>
            <input className="input" value={activeServiceProfile.supportPhone} onChange={(e) => updateActiveServiceField("supportPhone", e.target.value)} />
          </div>
          <div className="field">
            <label>{isCategoryInvoiceView ? "Authorised Signatory" : "Authorised Signatory (Override)"}</label>
            <input className="input" value={activeServiceProfile.authorizedSignatory} onChange={(e) => updateActiveServiceField("authorizedSignatory", e.target.value)} />
          </div>
        </div>
        <div className="flex-gap10-wrap mt-12">
          <button className="btn primary" onClick={saveInvoiceProfile} disabled={busy}><FaSave /> {busy ? "Saving..." : "Save Invoice Profile"}</button>
          <button className="btn" onClick={onReload} disabled={busy}><FaRedo /> Reload</button>
        </div>
      </div>
    </div>
  );
}

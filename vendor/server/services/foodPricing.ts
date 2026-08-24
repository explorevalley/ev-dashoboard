// Food menu pricing.
//
// A kitchen lists the price it wants to receive (`price`); the customer is
// charged the MRP (`mrp`), which the admin/vendor desk stores per dish as the
// vendor price plus a markup. Menu cards, the cart and order creation all have
// to agree on that single figure, so it is derived here and nowhere else.

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

export function parseMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function parseOffer(offerRaw: any) {
  const raw = safeText(offerRaw);
  if (!raw) return { kind: "none", value: 0, badgeText: "" };
  const upper = raw.toUpperCase().replace(/\s+/g, " ").trim();
  if (/B(?:UY)?\s*1\s*G(?:ET)?\s*1|BOGO|BUY ONE GET ONE/i.test(upper)) {
    return { kind: "bogo", value: 0, badgeText: "BUY 1 GET 1 FREE" };
  }
  const percentMatch = upper.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const value = Math.max(0, Math.min(100, Number(percentMatch[1]) || 0));
    return { kind: "percent", value, badgeText: `${value}% OFF` };
  }
  const flatMatch =
    upper.match(/(?:₹|RS\.?|INR)\s*(\d+(?:\.\d+)?)/i) ||
    upper.match(/(\d+(?:\.\d+)?)\s*(?:₹|RS\.?|INR)/i);
  if (flatMatch) {
    const value = Math.max(0, Number(flatMatch[1]) || 0);
    return { kind: "flat", value, badgeText: `₹${value} OFF` };
  }
  return { kind: "text", value: 0, badgeText: upper };
}

export function resolveOfferPricing(input: {
  basePrice: any;
  offerRaw?: any;
  legacyDropped?: any;
  legacyDropPercent?: any;
}) {
  const basePrice = parseMoney(input.basePrice);
  const parsed = parseOffer(input.offerRaw);
  let currentPrice = basePrice;
  if (parsed.kind === "percent" && parsed.value > 0) {
    currentPrice = Math.max(0, Math.round((basePrice * (100 - parsed.value)) / 100));
  } else if (parsed.kind === "flat" && parsed.value > 0) {
    currentPrice = Math.max(0, Math.round((basePrice - parsed.value) * 100) / 100);
  } else {
    const fallbackPercent = Math.max(
      0,
      Math.min(100, Number(input.legacyDropPercent || (input.legacyDropped ? 10 : 0)) || 0)
    );
    if (fallbackPercent > 0) {
      currentPrice = Math.max(0, Math.round((basePrice * (100 - fallbackPercent)) / 100));
    }
  }
  return {
    ...parsed,
    currentPrice,
    originalPrice: Math.max(basePrice, currentPrice),
  };
}

// Markup used when a dish has no stored MRP. Without it the customer app fell
// back to the vendor's own price for every dish that had never been saved from
// the vendor desk, i.e. the whole catalogue.
export const FOOD_MRP_MARKUP_PERCENT = (() => {
  const raw = Number(process.env.FOOD_MRP_MARKUP_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : 10;
})();

/** Vendor price -> the MRP we show when the desk has not stored one. */
export function deriveMenuItemMrp(basePrice: any) {
  const base = parseMoney(basePrice);
  if (base <= 0) return 0;
  return Math.round(base * (1 + FOOD_MRP_MARKUP_PERCENT / 100));
}

/**
 * The price a customer sees and is charged, plus the vendor base it came from.
 * Stored MRP wins; otherwise the base price is marked up. `basePrice` is only
 * ever used for the struck-through "was" figure on the menu card.
 */
export function customerFacingMenuPrice(m: any): { price: number; basePrice: number } {
  const offerPricing = resolveOfferPricing({
    basePrice: m?.price,
    offerRaw: m?.offer,
    legacyDropped: m?.priceDropped ?? m?.price_dropped,
    legacyDropPercent: m?.priceDropPercent ?? m?.price_drop_percent,
  });
  const basePrice = Math.max(0, Number(offerPricing.currentPrice || m?.price || 0) || 0);
  const storedMrp = Math.max(0, Number(m?.mrp ?? m?.MRP ?? 0) || 0);
  const price = storedMrp > 0 ? storedMrp : deriveMenuItemMrp(basePrice);
  return { price, basePrice };
}

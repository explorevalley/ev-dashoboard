import React, { useState } from "react";
import AdBannersWorkspace from "./AdBannersWorkspace";
import PromoCardsWorkspace from "./PromoCardsWorkspace";

/**
 * The two advertising surfaces, behind the one admin sign-in.
 *
 * They are kept on a single page rather than two nav entries because they are
 * booked together — a festival is usually a promo card at the front of the rail
 * and a banner further down the same screen — and splitting them made the
 * operator hunt for the second half.
 */
export default function AdsPromosWorkspace(props) {
  const [section, setSection] = useState("banners");

  return (
    <div className="ads-promos-workspace">
      <div className="row mb-8 ad-section-tabs">
        <button
          type="button"
          className={`tab${section === "banners" ? " active" : ""}`}
          onClick={() => setSection("banners")}
        >
          Ad banners
        </button>
        <button
          type="button"
          className={`tab${section === "promos" ? " active" : ""}`}
          onClick={() => setSection("promos")}
        >
          Promo cards
        </button>
      </div>

      <div className="small muted mb-8">
        {section === "banners"
          ? "Advertiser artwork dropped into the gaps between rows. Sold by screen and position, and counted."
          : "Cards you write, leading the sliding rail at the top of Home, Travel and Food. Not counted."}
      </div>

      {section === "banners"
        ? <AdBannersWorkspace {...props} />
        : <PromoCardsWorkspace {...props} />}
    </div>
  );
}

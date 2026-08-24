/**
 * `ev_taxi_fares` is the one source of taxi pricing: a flat mirror of the union's
 * fare sheet, one row per pickup → destination trip, one column per vehicle class.
 *
 * The app asks a different question than the table answers, though — it needs
 * "which pickups exist" and "from this pickup, where can I go and what does it
 * cost" — so `groupTaxiFares` folds the flat rows into one rate card per
 * pickup + zone. Both the server (`/api/cab-rates`) and the app's direct-Supabase
 * fallback run this same function, so they cannot drift apart.
 */

export type TaxiFareColumn = { name: string; label: string };

/**
 * The sheet stacks four rate cards side by side; each stand prices only its own
 * columns and leaves the rest null. Names match the `ev_taxi_fares` columns, labels
 * match the headers in "taxi details final.csv".
 */
export const TAXI_FARE_COLUMNS: TaxiFareColumn[] = [
  { name: "taxi", label: "Taxi" },
  { name: "maxi", label: "Maxi" },
  { name: "tempo_texi", label: "Tempo. Texi" },
  { name: "innova_crysta", label: "Innova Crysta" },
  { name: "scorpio_marazzo", label: "Scorpio Marazzo" },
  { name: "ertiga_eco_balero", label: "Ertiga, Eco, Balero" },
  { name: "creta_honda_city_ciaz", label: "Creta, Honda city, CIAZ" },
  { name: "tata_sumo_tuv", label: "TATA SUMO, TUV" },
  { name: "xuv_300_venue_urban_cruiser", label: "XUV 300, VENUE, URBAN CRUISER" },
  { name: "etios_dzire_aura_zest_amaze", label: "ETIOS, DZIRE,AURA, ZEST/ AMAZE" },
  { name: "glanza_baleno_i20", label: "GLANZA, BALENO,i20" },
  { name: "alto_celerio_santro_s_presso_wagon_r", label: "ALTO, CELERIO, SANTRO, S-PRESSO WAGON-R" },
  { name: "taxi_alto_eco_santro", label: "Taxi ( Alto/ Eco/ Santro" },
  { name: "taxi_swift_etios_xcent", label: "Taxi ( Swift Etios Xcent" },
  { name: "ertiga_scorpio_xylo", label: "Ertiga Scorpio Xylo" },
  { name: "innova_crysta_scorpio_n", label: "Innova Crysta, Scorpio N" },
  { name: "ordinary_4_plus_1", label: "ORDINARY 4+1" },
  { name: "luxury_4_plus_1", label: "LUXURY 4+1" },
  { name: "ordinary_6_plus_1_7_plus_1_8_plus_1", label: "ORDINAR Y 6+1,7+1,8+ 1" },
  { name: "luxury_6_plus_1_7_plus_1", label: "LUXURY 6+1,7+1" },
  { name: "traveller", label: "TRAVELLER" },
];

export type TaxiFareRow = Record<string, unknown>;

export type TaxiRateCard = {
  id: string;
  standName: string;
  pickupLabel: string;
  notes: string;
  displayOrder: number;
  active: boolean;
  vehicleColumns: Array<{ key: string; label: string }>;
  rateRows: Array<{ destination: string; rates: Record<string, string> }>;
};

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function collapse(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}

function slug(value: string): string {
  return collapse(value)
    .toLowerCase()
    .replace(/\+/g, "_plus_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The sheet shouts some names and whispers others — "BAHU", "jibhi", "MANIKARAN".
 * Title-case anything written in a single case so one pickup reads the same
 * everywhere; leave deliberate mixed case ("Him-Aanchal") alone.
 */
function displayName(value: unknown): string {
  const raw = collapse(value);
  if (!raw) return "";
  if (/[a-z]/.test(raw) && /[A-Z]/.test(raw)) return raw;
  return raw.replace(/[A-Za-z][A-Za-z']*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** The sheet writes "X" for "not applicable", including in the Valley column. */
function isPlaceholder(value: unknown): boolean {
  const raw = text(value).toUpperCase();
  return !raw || raw === "X";
}

function fareText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.round(n * 100) / 100);
}

function readField(row: TaxiFareRow, ...names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null) return row[name];
  }
  return undefined;
}

/**
 * Folds flat `ev_taxi_fares` rows into one rate card per pickup + zone.
 * Inactive rows are dropped, and a card whose fares are all blank is marked
 * inactive rather than shown to customers as unbookable destinations.
 */
export function groupTaxiFares(rows: TaxiFareRow[]): TaxiRateCard[] {
  const groups = new Map<string, {
    sources: Map<string, number>;
    valleys: Map<string, number>;
    zoneless: boolean;
    rows: TaxiFareRow[];
  }>();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (readField(row, "active") === false) continue;
    const source = collapse(readField(row, "source"));
    const destination = collapse(readField(row, "destination"));
    if (!source || !destination) continue;
    const rawValley = readField(row, "valley");
    const valley = collapse(rawValley);

    // Case-insensitive, so "Jibhi" and "jibhi" are one pickup rather than two.
    const key = `${source.toLowerCase()}|${valley.toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = { sources: new Map(), valleys: new Map(), zoneless: isPlaceholder(rawValley), rows: [] };
      groups.set(key, group);
    }
    group.sources.set(source, (group.sources.get(source) || 0) + 1);
    if (valley) group.valleys.set(valley, (group.valleys.get(valley) || 0) + 1);
    group.rows.push(row);
  }

  const pickVariant = (counts: Map<string, number>) =>
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";

  // One pickup carries one label everywhere, or the app's "From" list shows the
  // same stand twice under two spellings.
  const sourceLabels = new Map<string, string>();
  for (const group of groups.values()) {
    const source = pickVariant(group.sources);
    if (source) sourceLabels.set(source.toLowerCase(), displayName(source));
  }

  const cards: TaxiRateCard[] = [];
  const zonelessCards = new Set<TaxiRateCard>();
  for (const group of groups.values()) {
    const rawSource = pickVariant(group.sources);
    const source = sourceLabels.get(rawSource.toLowerCase()) || displayName(rawSource);
    const valley = displayName(pickVariant(group.valleys));

    const vehicleColumns = TAXI_FARE_COLUMNS
      .filter((column) => group.rows.some((row) => fareText(row[column.name])))
      .map((column) => ({ key: column.name, label: column.label }));

    const seen = new Map<string, number>();
    const rateRows: TaxiRateCard["rateRows"] = [];
    for (const row of group.rows) {
      const destination = collapse(readField(row, "destination"));
      const rates: Record<string, string> = {};
      vehicleColumns.forEach((column) => { rates[column.key] = fareText(row[column.key]); });
      // The sheet lists a few destinations twice with different prices; the first
      // priced listing wins so the app never shows two fares for one trip.
      const dedupeKey = destination.toLowerCase();
      const at = seen.get(dedupeKey);
      if (at === undefined) {
        seen.set(dedupeKey, rateRows.length);
        rateRows.push({ destination, rates });
      } else if (!Object.values(rateRows[at].rates).some(Boolean)) {
        rateRows[at] = { destination, rates };
      }
    }

    const sourceKey = source.toLowerCase();
    const valleyKey = valley.toLowerCase();
    let standName: string;
    if (group.zoneless || !valley || sourceKey === valleyKey) standName = `${source} Taxi Stand`;
    else if (valleyKey.startsWith(`${sourceKey} `)) standName = valley;
    else standName = `${source} → ${valley}`;

    const priced = vehicleColumns.length > 0;
    const card: TaxiRateCard = {
      id: `taxi_rates_${slug(source)}_${group.zoneless || !valley ? "main" : slug(valley)}`,
      standName,
      pickupLabel: source,
      notes: priced ? "" : `No fares set for these ${valley || "destinations"} yet.`,
      displayOrder: 0,
      active: priced,
      vehicleColumns,
      rateRows,
    };
    cards.push(card);
    if (group.zoneless || !valley) zonelessCards.add(card);
  }

  // A pickup can have both a "<Pickup>/<Pickup>" card and an unzoned one, which
  // would otherwise both be named "<Pickup> Taxi Stand". Only the unzoned card —
  // the leftover outstation trips — gets renamed.
  const nameCounts = new Map<string, number>();
  cards.forEach((card) => nameCounts.set(card.standName, (nameCounts.get(card.standName) || 0) + 1));
  cards.forEach((card) => {
    if (zonelessCards.has(card) && (nameCounts.get(card.standName) || 0) > 1) {
      card.standName = `${card.pickupLabel} → Other destinations`;
    }
  });

  cards.sort((a, b) => a.pickupLabel.localeCompare(b.pickupLabel) || a.standName.localeCompare(b.standName));
  cards.forEach((card, index) => { card.displayOrder = index + 1; });
  return cards;
}

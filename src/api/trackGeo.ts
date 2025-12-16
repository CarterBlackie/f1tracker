// src/api/trackGeo.ts

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, any>;
    geometry: {
      type: string;
      coordinates: any;
    };
  }>;
};

const GEOJSON_URL =
  "https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson";

let cached: GeoJSONFeatureCollection | null = null;

export async function getAllCircuitGeo(): Promise<GeoJSONFeatureCollection> {
  if (cached) return cached;

  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`Failed to load circuit geojson (${res.status})`);
  cached = (await res.json()) as GeoJSONFeatureCollection;
  return cached;
}

// Keys are Ergast/Jolpica circuitId when you have it.
// We can keep this, but Live will also use hint-based search.
const CIRCUIT_NAME_HINTS: Record<string, string[]> = {
  // Europe
  monza: ["Monza", "Autodromo Nazionale Monza"],
  silverstone: ["Silverstone"],
  spa: ["Spa", "Spa-Francorchamps", "Circuit de Spa-Francorchamps"],
  monaco: ["Monaco", "Circuit de Monaco"],
  hungaroring: ["Hungaroring"],
  zandvoort: ["Zandvoort"],
  red_bull_ring: ["Red Bull Ring", "Spielberg"],
  imola: ["Imola", "Enzo e Dino Ferrari"],
  catalunya: ["Barcelona", "Catalunya", "Circuit de Barcelona-Catalunya"],
  baku: ["Baku", "Bakı", "Baki", "Baku City Circuit"],
  singapore: ["Singapore", "Marina Bay"],

  // Asia / Middle East
  suzuka: ["Suzuka", "Suzuka International Racing Course"],
  yas_marina: ["Yas Marina", "Abu Dhabi"],
  sakhir: ["Bahrain", "Sakhir"],
  jeddah: ["Jeddah", "Saudi"],
  losail: ["Losail", "Lusail", "Qatar"],
  shanghai: ["Shanghai", "Chinese Grand Prix"],

  // Americas
  interlagos: ["Interlagos", "São Paulo", "Sao Paulo"],
  americas: ["Circuit of the Americas", "COTA", "Austin"],
  miami: ["Miami"],
  mexico: ["Hermanos Rodríguez", "Hermanos Rodriguez", "Mexico City"],
  vegas: ["Las Vegas"],
  montreal: ["Gilles Villeneuve", "Montreal", "Montréal"],

  // Oceania
  albert_park: ["Albert Park", "Melbourne"],
};

function featureHaystack(props: Record<string, any>) {
  const p = props ?? {};
  return [
    p.name,
    p.Name,
    p.location,
    p.Location,
    p.circuit,
    p.Circuit,
    p.country,
    p.Country,
    p.city,
    p.City,
    p.state,
    p.State,
    p.region,
    p.Region,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function pickLineStringFromGeometry(g: { type: string; coordinates: any }) {
  if (g.type === "LineString") {
    return (g.coordinates as Array<[number, number]>).slice();
  }

  if (g.type === "MultiLineString") {
    const segments = g.coordinates as Array<Array<[number, number]>>;
    const longest = segments.reduce(
      (a, b) => (b.length > a.length ? b : a),
      segments[0] ?? []
    );
    return longest.slice();
  }

  return null;
}

function normalizeHint(s: string) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findByHints(
  fc: GeoJSONFeatureCollection,
  hints: string[]
): Array<[number, number]> | null {
  const cleanHints = hints
    .map(normalizeHint)
    .filter((h) => h.length >= 3); // ignore tiny tokens

  if (!cleanHints.length) return null;

  const match = fc.features.find((f) => {
    const hay = featureHaystack(f.properties ?? {});
    return cleanHints.some((h) => hay.includes(h));
  });

  if (!match) return null;
  return pickLineStringFromGeometry(match.geometry);
}

/**
 * Original API: tries CIRCUIT_NAME_HINTS first, otherwise uses the id as a hint.
 */
export async function getCircuitLineString(
  circuitId: string
): Promise<Array<[number, number]> | null> {
  const fc = await getAllCircuitGeo();

  const hints = CIRCUIT_NAME_HINTS[circuitId] ?? [circuitId];

  // Try hints, then try a normalized variant
  return (
    findByHints(fc, hints) ??
    findByHints(fc, [normalizeHint(circuitId)]) ??
    null
  );
}

/**
 * NEW: best-effort search that does not require a known circuitId key.
 * Pass things like: circuit_short_name, city, country, "Losail", "Qatar", etc.
 */
export async function getCircuitLineStringByHints(
  hints: string[]
): Promise<Array<[number, number]> | null> {
  const fc = await getAllCircuitGeo();
  return findByHints(fc, hints);
}

export function lineToSvgPath(
  coords: Array<[number, number]>,
  viewW = 160,
  viewH = 120,
  pad = 8
): string {
  // coords are typically [lon, lat]. We normalize them into the SVG viewBox.
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = Math.max(1e-9, maxX - minX);
  const height = Math.max(1e-9, maxY - minY);

  const scaleX = (viewW - pad * 2) / width;
  const scaleY = (viewH - pad * 2) / height;
  const s = Math.min(scaleX, scaleY);

  const toX = (lon: number) => pad + (lon - minX) * s;
  // flip Y for SVG (so north isn't upside down)
  const toY = (lat: number) => pad + (maxY - lat) * s;

  const [x0, y0] = coords[0];
  let d = `M ${toX(x0).toFixed(2)} ${toY(y0).toFixed(2)}`;

  for (let i = 1; i < coords.length; i++) {
    const [x, y] = coords[i];
    d += ` L ${toX(x).toFixed(2)} ${toY(y).toFixed(2)}`;
  }

  return d;
}

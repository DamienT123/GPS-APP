export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  elements: OverpassElement[];
};

export type ExploreCategory = "sights" | "hotels" | "nature" | "cafes" | "restaurants";

export type ExplorePlace = {
  id: string;
  source: "osm";
  name: string;
  lon: number;
  lat: number;
  category: ExploreCategory;
  tags: Record<string, string>;
  distanceMeters?: number;
};

export type PlaceContext = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function toRad(n: number) {
  return (n * Math.PI) / 180;
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

function getElementLonLat(el: OverpassElement): { lon: number; lat: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  if (el.center && typeof el.center.lat === "number" && typeof el.center.lon === "number")
    return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function bestName(tags?: Record<string, string>) {
  const t = tags || {};
  return (t.name || t["name:en"] || t["name:nl"] || "").trim();
}

function filterBlockForCategory(cat: ExploreCategory, radius: number, lat: number, lon: number) {
  const around = `(around:${Math.round(radius)},${lat},${lon})`;

  if (cat === "cafes") {
    return `
      nwr["amenity"="cafe"]${around};
      nwr["amenity"="coffee_shop"]${around};
    `;
  }

  if (cat === "restaurants") {
    return `
      nwr["amenity"="restaurant"]${around};
      nwr["amenity"="fast_food"]${around};
    `;
  }

  if (cat === "hotels") {
    return `
      nwr["tourism"="hotel"]${around};
      nwr["tourism"="hostel"]${around};
      nwr["tourism"="guest_house"]${around};
    `;
  }

  if (cat === "nature") {
    return `
      nwr["leisure"="park"]${around};
      nwr["boundary"="national_park"]${around};
      nwr["natural"="wood"]${around};
      nwr["natural"="peak"]${around};
      nwr["waterway"="waterfall"]${around};
      nwr["natural"="beach"]${around};
      nwr["natural"="spring"]${around};
    `;
  }

  return `
    nwr["tourism"="attraction"]${around};
    nwr["tourism"="museum"]${around};
    nwr["tourism"="viewpoint"]${around};
    nwr["tourism"="gallery"]${around};
    nwr["historic"="castle"]${around};
    nwr["historic"="ruins"]${around};
    nwr["historic"="monument"]${around};
    nwr["historic"="memorial"]${around};
    nwr["man_made"="tower"]${around};
  `;
}

function inferCategoryFromTags(tags: Record<string, string>): ExploreCategory {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const natural = tags.natural;
  const leisure = tags.leisure;
  const historic = tags.historic;

  if (amenity === "cafe" || amenity === "coffee_shop") return "cafes";
  if (amenity === "restaurant" || amenity === "fast_food") return "restaurants";
  if (tourism === "hotel" || tourism === "hostel" || tourism === "guest_house") return "hotels";

  if (leisure === "park" || tags.boundary === "national_park" || typeof natural === "string") return "nature";

  if (
    tourism === "attraction" ||
    tourism === "museum" ||
    tourism === "viewpoint" ||
    tourism === "gallery" ||
    tags.man_made === "tower" ||
    typeof historic === "string"
  ) {
    return "sights";
  }

  return "sights";
}

export async function overpassQuery(query: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function searchNearbyOSM(params: {
  center: { lat: number; lon: number };
  radiusMeters: number;
  categories: ExploreCategory[];
  limit?: number;
  withDistance?: boolean;
}): Promise<ExplorePlace[]> {
  const { center, radiusMeters, categories } = params;
  const limit = params.limit ?? 250;
  const withDistance = params.withDistance ?? true;

  if (!categories.length) return [];

  const blocks = categories
    .map((c) => filterBlockForCategory(c, radiusMeters, center.lat, center.lon))
    .join("\n");

  const q = `
    [out:json][timeout:25];
    (
      ${blocks}
    );
    out tags center ${limit};
  `;

  const data = await overpassQuery(q);

  const raw: ExplorePlace[] = [];
  for (const el of data.elements || []) {
    const ll = getElementLonLat(el);
    if (!ll) continue;

    const tags = el.tags || {};
    const name = bestName(tags);
    if (!name) continue;

    const inferred = inferCategoryFromTags(tags);
    if (!categories.includes(inferred)) continue;

    if (inferred === "sights") {
      const tourism = tags.tourism;
      const historic = tags.historic;

      const ok =
        tourism === "attraction" ||
        tourism === "museum" ||
        tourism === "viewpoint" ||
        tourism === "gallery" ||
        tags.man_made === "tower" ||
        historic === "castle" ||
        historic === "ruins" ||
        historic === "monument" ||
        historic === "memorial";

      if (!ok) continue;
    }

    const p: ExplorePlace = {
      id: `${el.type}/${el.id}`,
      source: "osm",
      name,
      lon: ll.lon,
      lat: ll.lat,
      category: inferred,
      tags,
    };

    if (withDistance) {
      p.distanceMeters = haversineMeters(center, { lat: p.lat, lon: p.lon });
    }

    raw.push(p);
  }

  const uniq = new Map<string, ExplorePlace>();
  for (const p of raw) uniq.set(p.id, p);

  const out = Array.from(uniq.values());
  out.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

  return out;
}

export function formatAddress(tags: Record<string, string>) {
  const street = tags["addr:street"];
  const nr = tags["addr:housenumber"];
  const city = tags["addr:city"];
  const postcode = tags["addr:postcode"];

  const line1 = street && nr ? `${street} ${nr}` : street || "";
  const line2 = postcode && city ? `${postcode} ${city}` : city || "";

  return [line1, line2].filter(Boolean).join(", ");
}

const TITLE_KEYS_IN_ORDER = [
  "tourism",
  "amenity",
  "historic",
  "leisure",
  "natural",
  "shop",
  "man_made",
  "place",
  "building",
  "office",
  "sport",
];

function humanizeOSMValue(v: string) {
  const s = v.replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : v;
}

function firstExistingTag(tags: Record<string, string>) {
  for (const k of TITLE_KEYS_IN_ORDER) {
    const val = tags[k];
    if (val && val.trim()) return { key: k, value: val.trim() };
  }
  return null;
}

export function describePlaceType(tags: Record<string, string>) {
  const base = firstExistingTag(tags);

  const cuisine = tags.cuisine ? humanizeOSMValue(tags.cuisine) : "";
  const shop = tags.shop ? humanizeOSMValue(tags.shop) : "";
  const sport = tags.sport ? humanizeOSMValue(tags.sport) : "";

  if (tags.amenity === "restaurant" && cuisine) {
    return { label: `${cuisine} restaurant`, sourceKey: "amenity" };
  }
  if (tags.amenity === "cafe" && cuisine) {
    return { label: `${cuisine} café`, sourceKey: "amenity" };
  }
  if (tags.shop && shop) {
    return { label: `${shop} shop`, sourceKey: "shop" };
  }
  if (tags.leisure === "sports_centre" && sport) {
    return { label: `${sport} sports centre`, sourceKey: "leisure" };
  }

  if (base) {
    return { label: humanizeOSMValue(base.value), sourceKey: base.key };
  }

  if (tags.highway) return { label: `Road feature (${humanizeOSMValue(tags.highway)})`, sourceKey: "highway" };
  if (tags.waterway) return { label: `Waterway (${humanizeOSMValue(tags.waterway)})`, sourceKey: "waterway" };

  return { label: "Unknown", sourceKey: "" };
}

export function pickUsefulInfo(tags: Record<string, string>) {
  return {
    website: tags.website || tags["contact:website"] || "",
    phone: tags.phone || tags["contact:phone"] || "",
    openingHours: tags.opening_hours || "",
    cuisine: tags.cuisine || "",
  };
}

export function bestCityFromContext(a: PlaceContext | null) {
  if (!a) return "";
  return (a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || "").trim();
}

export async function reverseGeocodeOSM(lat: number, lon: number): Promise<PlaceContext | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "gps-app-student-project" },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return (data?.address ?? null) as PlaceContext | null;
}

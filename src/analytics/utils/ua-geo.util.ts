export type ParsedUA = {
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { manufacturer: string; model: string; type: string };
};

// Lightweight UA parsing (fallback). Not exhaustive; good enough for aggregates.
export function parseUserAgent(userAgent?: string): ParsedUA {
  const ua = userAgent || '';

  // Browser
  let browserName = 'Unknown';
  let browserVersion = '';
  const browserMatchers: Array<{ name: string; regex: RegExp }> = [
    { name: 'Edge', regex: /Edg\/(\d+[\w\.]*)/ },
    { name: 'Chrome', regex: /Chrome\/(\d+[\w\.]*)/ },
    { name: 'Firefox', regex: /Firefox\/(\d+[\w\.]*)/ },
    { name: 'Safari', regex: /Version\/(\d+[\w\.]*)\s+Safari/ },
    { name: 'Mobile Safari', regex: /Mobile\/(?:\S+)\s+Safari\/(\d+[\w\.]*)/ },
  ];
  for (const m of browserMatchers) {
    const match = ua.match(m.regex);
    if (match) {
      browserName = m.name;
      browserVersion = match[1] || '';
      break;
    }
  }

  // OS
  let osName = 'Unknown';
  let osVersion = '';
  if (/Windows NT/.test(ua)) {
    osName = 'Windows';
    const m = ua.match(/Windows NT\s(\d+[\._]?\d*)/);
    osVersion = m?.[1] || '';
  } else if (/Android/.test(ua)) {
    osName = 'Android';
    const m = ua.match(/Android\s(\d+[\._]?\d*)/);
    osVersion = m?.[1] || '';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    osName = 'iOS';
    const m = ua.match(/OS\s(\d+[\._]?\d*)/);
    osVersion = m?.[1]?.replace('_', '.') || '';
  } else if (/Mac OS X/.test(ua)) {
    osName = 'macOS';
    const m = ua.match(/Mac OS X\s(\d+[\._]?\d*)/);
    osVersion = m?.[1]?.replace(/_/g, '.') || '';
  } else if (/Linux/.test(ua)) {
    osName = 'Linux';
  }

  // Device
  let type = 'desktop';
  if (/Mobi|Android/.test(ua)) type = 'phone';
  if (/iPad|Tablet/.test(ua)) type = 'tablet';
  let manufacturer = 'Unknown';
  let model = '';
  if (/iPhone|iPad|iPod/.test(ua)) manufacturer = 'Apple';
  if (/Samsung/.test(ua)) manufacturer = 'Samsung';
  if (/Huawei/.test(ua)) manufacturer = 'Huawei';
  if (/Xiaomi/.test(ua)) manufacturer = 'Xiaomi';

  return {
    browser: { name: browserName, version: browserVersion },
    os: { name: osName, version: osVersion },
    device: { manufacturer, model, type },
  };
}

export type GeoInfo = {
  country: string; // Full country name if known; else ISO code or 'Unknown'
  countryCode: string;
  region?: string;
  city?: string;
};

// Minimal GeoIP via Cloudflare headers (if behind CF) or default unknown.
export function extractGeoFromHeaders(headers: Record<string, unknown>): GeoInfo {
  const get = (k: string) => String(headers[k] || headers[k.toLowerCase()] || '');
  const country = get('cf-ipcountry') || get('x-vercel-ip-country') || '';
  const region = get('x-vercel-ip-country-region') || '';
  const city = get('x-vercel-ip-city') || '';
  return {
    country: country || 'Unknown',
    countryCode: country || 'ZZ',
    region: region || undefined,
    city: city || undefined,
  };
}

// Attempt to resolve Geo via local geoip-lite database, fallback to Unknown.
export function lookupGeoByIp(ip?: string | null): GeoInfo {
  if (!ip) return { country: 'Unknown', countryCode: 'ZZ' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const geoip = require('geoip-lite');
    // Normalize X-Forwarded-For list (take first), strip port
    const firstIp = String(ip).split(',')[0].trim().replace(/:\d+$/, '');
    if (isPrivateIp(firstIp)) return { country: 'Unknown', countryCode: 'ZZ' };

    // Try MaxMind GeoLite2 City if available
    const mmdb = getMaxmindReader();
    if (mmdb) {
      const res = mmdb.get(firstIp);
      if (res) {
        const cc: string | undefined = res.country?.iso_code || res.registered_country?.iso_code;
        const countryName = res.country?.names?.en || res.registered_country?.names?.en || (cc ? isoCountryName(cc) : undefined) || 'Unknown';
        const region = Array.isArray(res.subdivisions) && res.subdivisions.length > 0 ? (res.subdivisions[0].iso_code || res.subdivisions[0].names?.en) : undefined;
        const city = res.city?.names?.en || res.city?.names?.pt || res.city?.names?.es || res.city?.names?.fr || res.city?.names?.ru || res.city?.names?.zh || undefined;
        return {
          country: countryName,
          countryCode: cc || 'ZZ',
          region,
          city,
        };
      }
    }
    const r = geoip.lookup(firstIp);
    if (!r) return { country: 'Unknown', countryCode: 'ZZ' };
    // r.country is ISO code; map to readable name when possible
    const name = isoCountryName(r.country) || r.country || 'Unknown';
    return {
      country: name,
      countryCode: r.country || 'ZZ',
      region: Array.isArray(r.region) ? r.region[0] : r.region,
      city: Array.isArray(r.city) ? r.city[0] : r.city,
    } as GeoInfo;
  } catch {
    return { country: 'Unknown', countryCode: 'ZZ' };
  }
}

// Minimal ISO2 -> English name mapping for common countries; can be expanded
function isoCountryName(iso?: string): string | undefined {
  if (!iso) return undefined;
  const code = iso.toUpperCase();
  const map: Record<string, string> = {
    US: 'United States',
    BR: 'Brazil',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    PT: 'Portugal',
    CA: 'Canada',
    MX: 'Mexico',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    AU: 'Australia',
    NZ: 'New Zealand',
    JP: 'Japan',
    CN: 'China',
    IN: 'India',
    ZA: 'South Africa',
  };
  return map[code];
}

function isPrivateIp(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip === '127.0.0.1' ||
    ip === '::1'
  );
}

let maxmindReader: any | null | undefined;
function getMaxmindReader(): any | null {
  if (maxmindReader !== undefined) return maxmindReader;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maxmind = require('maxmind');
    const fs = require('fs');
    const dbPath = process.env.GEOIP_CITY_DB_PATH || '/usr/share/GeoIP/GeoLite2-City.mmdb';
    if (fs.existsSync(dbPath)) {
      maxmindReader = new maxmind.Reader(fs.readFileSync(dbPath));
      return maxmindReader;
    }
    maxmindReader = null;
    return null;
  } catch {
    maxmindReader = null;
    return null;
  }
}


import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1LocationPoint,
  OpenF1PositionPoint,
  OpenF1Lap,
} from "../types/openf1";
import { loadCache, saveCache } from "../utils/cache";

const BASE = "https://api.openf1.org/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const cached = loadCache<T>(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}`);

  const data = (await res.json()) as T;
  saveCache(url, data);
  return data;
}

export async function listRaceSessions(year: number): Promise<OpenF1Session[]> {
  return fetchJson(`${BASE}/sessions?year=${year}&session_name=Race`);
}

export async function getSessionDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  return fetchJson(`${BASE}/drivers?session_key=${sessionKey}`);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function sessionTimeAt(session: OpenF1Session, t01: number): Date {
  const start = new Date(session.date_start).getTime();
  const end = new Date(session.date_end).getTime();
  const t = start + (end - start) * clamp01(t01);
  return new Date(t);
}

function isoPlusMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

function roundIsoToBucket(centerIso: string, bucketMs: number) {
  const ms = new Date(centerIso).getTime();
  const rounded = Math.floor(ms / bucketMs) * bucketMs;
  return new Date(rounded).toISOString();
}

export async function getLocationSlice(
  sessionKey: number,
  centerIso: string,
  windowMs = 800
): Promise<OpenF1LocationPoint[]> {
  const bucketCenter = roundIsoToBucket(centerIso, 2000);
  const from = isoPlusMs(bucketCenter, -windowMs);
  const to = isoPlusMs(bucketCenter, windowMs);

  return fetchJson(
    `${BASE}/location?session_key=${sessionKey}&date>=${encodeURIComponent(
      from
    )}&date<=${encodeURIComponent(to)}`
  );
}

export async function getPositionSlice(
  sessionKey: number,
  centerIso: string,
  windowMs = 1200
): Promise<OpenF1PositionPoint[]> {
  const bucketCenter = roundIsoToBucket(centerIso, 2000);
  const from = isoPlusMs(bucketCenter, -windowMs);
  const to = isoPlusMs(bucketCenter, windowMs);

  return fetchJson(
    `${BASE}/position?session_key=${sessionKey}&date>=${encodeURIComponent(
      from
    )}&date<=${encodeURIComponent(to)}`
  );
}

/**
 * Laps update slowly, so we query a wider window around time.
 * Using date_start filters keeps it reasonable.
 */
export async function getLapsSlice(
  sessionKey: number,
  centerIso: string,
  windowMs = 1000 * 60 * 12 // 12 minutes
): Promise<OpenF1Lap[]> {
  const bucketCenter = roundIsoToBucket(centerIso, 2000);
  const from = isoPlusMs(bucketCenter, -windowMs);
  const to = isoPlusMs(bucketCenter, windowMs);

  return fetchJson(
    `${BASE}/laps?session_key=${sessionKey}&date_start>=${encodeURIComponent(
      from
    )}&date_start<=${encodeURIComponent(to)}`
  );
}

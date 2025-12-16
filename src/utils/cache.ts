type CacheEntry<T> = {
  time: number;
  data: T;
};

const PREFIX = "f1tracker:";
const TTL = 1000 * 60 * 10; // 10 minutes

export function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.time > TTL) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function saveCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { time: Date.now(), data };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

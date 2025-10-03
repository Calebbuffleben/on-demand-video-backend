import { Injectable, Logger } from '@nestjs/common';

type CachedHeaders = Record<string, string>;

interface CachedEntry {
  key: string;
  data: Buffer;
  headers: CachedHeaders;
  expiresAt: number; // epoch ms
  size: number; // bytes
}

@Injectable()
export class ContentCacheService {
  private readonly logger = new Logger(ContentCacheService.name);
  private readonly maxBytes: number;
  private readonly entries = new Map<string, CachedEntry>(); // LRU order by re-insert
  private totalBytes = 0;

  constructor() {
    // Default 512MB in-memory cache (configurable via env)
    const envMax = Number(process.env.ACCOUNT_CACHE_MAX_BYTES || 512 * 1024 * 1024);
    this.maxBytes = Number.isFinite(envMax) && envMax > 0 ? envMax : 512 * 1024 * 1024;
  }

  private now(): number {
    return Date.now();
  }

  private evictIfNeeded() {
    // Evict expired first
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= this.now()) {
        this.delete(key);
      }
    }
    // Evict LRU until under limit
    while (this.totalBytes > this.maxBytes && this.entries.size > 0) {
      const oldestKey = this.entries.keys().next().value as string;
      this.delete(oldestKey);
    }
  }

  private touch(entry: CachedEntry) {
    // Refresh LRU order: delete and re-set
    this.entries.delete(entry.key);
    this.entries.set(entry.key, entry);
  }

  get(key: string): { data: Buffer; headers: CachedHeaders } | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.delete(key);
      return null;
    }
    this.touch(entry);
    return { data: entry.data, headers: { ...entry.headers } };
  }

  set(key: string, data: Buffer, headers: CachedHeaders, ttlSeconds: number): void {
    const expiresAt = this.now() + Math.max(1, Math.floor(ttlSeconds)) * 1000;
    const size = data.byteLength;
    // Replace existing if present
    const existing = this.entries.get(key);
    if (existing) {
      this.totalBytes -= existing.size;
      this.entries.delete(key);
    }
    const entry: CachedEntry = { key, data, headers: { ...headers }, expiresAt, size };
    this.entries.set(key, entry);
    this.totalBytes += size;
    this.evictIfNeeded();
    this.logger.debug(`Cached key=${key} size=${size} ttl=${ttlSeconds}s totalBytes=${this.totalBytes}`);
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.totalBytes -= entry.size;
    return true;
  }
}



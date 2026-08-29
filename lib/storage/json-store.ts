/**
 * Minimal JSON-file backed store used for the self-contained hackathon demo.
 * The interface mirrors what a PostgreSQL adapter would provide, so swapping
 * to Supabase/PostgreSQL later does not change business logic.
 */
import fs from "node:fs";
import path from "node:path";

export type StoreShape = Record<string, unknown[]>;

const DATA_DIR = path.join(process.cwd(), "data");

export class JsonStore<T extends { id: string }> {
  private file: string;
  private cache: T[] | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(collection: string) {
    this.file = path.join(DATA_DIR, `${collection}.json`);
  }

  private load(): T[] {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, "utf8");
        const parsed = JSON.parse(raw) as { items: T[] };
        this.cache = parsed.items ?? [];
      } else {
        this.cache = [];
      }
    } catch (err) {
      console.error(`[store] failed to load ${this.file}`, err);
      this.cache = [];
    }
    return this.cache;
  }

  private persist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const payload = JSON.stringify({ items: this.load() }, null, 2);
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, payload, "utf8");
      fs.renameSync(tmp, this.file);
    });
    return this.writeQueue;
  }

  all(): T[] {
    return [...this.load()];
  }

  byId(id: string): T | undefined {
    return this.load().find((x) => x.id === id);
  }

  insert(item: T): T {
    this.load().push(item);
    void this.persist();
    return item;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const items = this.load();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return undefined;
    items[idx] = { ...items[idx], ...patch, id: items[idx].id } as T;
    void this.persist();
    return items[idx];
  }

  upsert(item: T): T {
    const idx = this.load().findIndex((x) => x.id === item.id);
    if (idx === -1) {
      this.load().push(item);
    } else {
      this.load()[idx] = item;
    }
    void this.persist();
    return item;
  }

  delete(id: string): boolean {
    const items = this.load();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    void this.persist();
    return true;
  }

  clear(): void {
    this.cache = [];
    void this.persist();
  }
}

export function ensureStoreDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
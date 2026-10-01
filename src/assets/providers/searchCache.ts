import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/** Persist search responses for 24 hours; never store credentials in cache names. */
export class SearchCache {
  private counts = new Map<string, number>();
  private disabled = new Set<string>();
  private lastRequest = new Map<string, number>();
  public events: string[] = [];
  constructor(
    private directory = path.resolve(".cache/visual-search-v2"),
    private request: typeof fetch = fetch,
  ) {}

  async json(
    provider: string,
    key: string,
    url: string,
    headers: Record<string, string> = {},
  ) {
    const digest = createHash("sha256")
      .update(provider + ":" + key)
      .digest("hex");
    const file = path.join(this.directory, digest + ".json");
    try {
      const entry = JSON.parse(fs.readFileSync(file, "utf8"));
      if (entry.expires > Date.now()) return entry.data;
    } catch {
      /* Missing/invalid cache can be rebuilt. */
    }
    if (this.disabled.has(provider)) return null;
    if ((this.counts.get(provider) ?? 0) >= 120) {
      this.disabled.add(provider);
      this.events.push(`${provider}:search-budget-reached`);
      return null;
    }
    this.counts.set(provider, (this.counts.get(provider) ?? 0) + 1);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Pixabay's default allowance is 100 requests/minute. Space uncached calls.
        if (provider === "pixabay") {
          const wait =
            650 - (Date.now() - (this.lastRequest.get(provider) ?? 0));
          if (wait > 0)
            await new Promise((resolve) => setTimeout(resolve, wait));
        }
        this.lastRequest.set(provider, Date.now());
        const response = await this.request(url, {
          headers,
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
          if (
            response.status === 429 ||
            response.status === 401 ||
            response.status === 403
          ) {
            this.disabled.add(provider);
            this.events.push(`${provider}:unavailable-http-${response.status}`);
            return null; // Respect throttling; do not rotate keys or evade it.
          }
          if (response.status < 500) return null;
          throw new Error("upstream");
        }
        const data = await response.json();
        fs.mkdirSync(this.directory, { recursive: true });
        fs.writeFileSync(
          file + ".tmp",
          JSON.stringify({ expires: Date.now() + 86400000, data }),
        );
        fs.renameSync(file + ".tmp", file);
        return data;
      } catch {
        if (attempt < 2)
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * (attempt + 1)),
          );
      }
    }
    this.disabled.add(provider);
    this.events.push(`${provider}:network-unavailable`);
    return null;
  }
}

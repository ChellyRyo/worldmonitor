import { mkdir, writeFile, rm } from 'node:fs/promises';
import { BROWSER_NEWS_CATALOG } from '../src/config/news-catalog.browser.generated.ts';
import { FREE_NEWS_FEEDS_PER_CATEGORY, newsSnapshotPath } from '../shared/free-hosting.ts';

// No credentials or hosted WorldMonitor services: only catalogued public RSS.
const urls = [...new Set(Object.values(BROWSER_NEWS_CATALOG.editions.full!)
  .flatMap(feeds => feeds.slice(0, FREE_NEWS_FEEDS_PER_CATEGORY))
  .flatMap(feed => typeof feed.url === 'string' ? [feed.url] : Object.values(feed.url))
  .filter(url => /^https:\/\//.test(url)))];
if (urls.length > 200) throw new Error('Free snapshot request budget exceeded');
if (new Set(urls.map(newsSnapshotPath)).size !== urls.length) throw new Error('Snapshot path collision');
// This fixed directory is generated exclusively by this script.
await rm(new URL('../public/free-data/', import.meta.url), { recursive: true, force: true });
await mkdir('public/free-data/news', { recursive: true });
const feeds: Array<{ url: string; fetchedAt: string | null; available: boolean }> = [];
for (let offset = 0; offset < urls.length; offset += 8) {
  await Promise.all(urls.slice(offset, offset + 8).map(async url => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'WorldMonitor-Free-Snapshot/1.0 (+https://github.com/ChellyRyo/worldmonitor)' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) throw new Error('Feed exceeds size limit');
        chunks.push(chunk);
      }
      const xml = Buffer.concat(chunks).toString('utf8');
      if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('Not a news feed');
      await writeFile(`public${newsSnapshotPath(url)}`, xml);
      feeds.push({ url, fetchedAt: new Date().toISOString(), available: true });
    } catch {
      // Do not re-date stale data or silently publish an empty successful feed.
      feeds.push({ url, fetchedAt: null, available: false });
    }
  }));
}
const available = feeds.filter(feed => feed.available).length;
if (!available) throw new Error('No public news sources available; refusing an empty deployment');
await writeFile('public/free-data/manifest.json', JSON.stringify({ generatedAt: new Date().toISOString(), available, total: feeds.length, feeds }));
console.log(`Public news snapshots: ${available}/${feeds.length} available`);

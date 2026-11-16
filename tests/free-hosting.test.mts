import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BROWSER_NEWS_CATALOG } from '../src/config/news-catalog.browser.generated.ts';
import { FREE_NEWS_FEEDS_PER_CATEGORY, newsSnapshotPath } from '../shared/free-hosting.ts';

test('catalogued free news URLs fit the build budget and have collision-free paths', () => {
  const urls = [...new Set(Object.values(BROWSER_NEWS_CATALOG.editions.full!)
    .flatMap(feeds => feeds.slice(0, FREE_NEWS_FEEDS_PER_CATEGORY))
    .flatMap(feed => typeof feed.url === 'string' ? [feed.url] : Object.values(feed.url)))];
  assert.ok(urls.length > 0 && urls.length <= 200);
  assert.equal(new Set(urls.map(newsSnapshotPath)).size, urls.length);
  assert.notEqual(newsSnapshotPath('https://example.org/rss?lang=en'), newsSnapshotPath('https://example.org/rss?lang=zh'));
  assert.match(newsSnapshotPath('https://example.org/../../attack?x=<script>'), /^\/free-data\/news\/[0-9a-f]+\.txt$/);
});

test('free deployment excludes server functions and serves snapshots as inert content', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.builds, [{ src: "package.json", use: "@vercel/static-build", config: { distDir: "dist" } }]);
  assert.ok(!config.rewrites.some((rule: { destination: string }) => rule.destination.startsWith('/api/')));
  const headers = config.headers.find((rule: { source: string }) => rule.source === '/free-data/news/(.*)').headers;
  assert.ok(headers.some((header: { key: string; value: string }) => header.key === 'Content-Type' && header.value.startsWith('text/plain')));
  assert.ok(headers.some((header: { key: string; value: string }) => header.key === 'Content-Security-Policy' && header.value.includes('sandbox')));
});

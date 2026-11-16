// Stable public snapshot paths, shared by the browser and build process.
export function newsSnapshotPath(url: string): string {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  return `/free-data/news/${(hash >>> 0).toString(16)}.txt`;
}

export const FREE_NEWS_FEEDS_PER_CATEGORY = 6;

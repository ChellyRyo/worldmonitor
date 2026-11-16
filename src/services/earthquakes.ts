import { getRpcBaseUrl } from '@/services/rpc-client';
import { FREE_HOSTING } from '@/config/free-hosting';
import type { Earthquake as ProtoEarthquake, ListEarthquakesResponse } from '@/generated/client/worldmonitor/seismology/v1/service_client';
import { createCircuitBreaker } from '@/utils/circuit-breaker';
import { getHydratedData } from '@/services/bootstrap';
import { SeismologyServiceClient } from '@/services/generated-rpc-clients';

// Proto Earthquake.source / .category (fields 12 / 13) carry USGS vs NRCan
// attribution. Keep the union so dashboard/MCP can narrow 'usgs' | 'nrcan'.
export type Earthquake = ProtoEarthquake & {
  source?: 'usgs' | 'nrcan' | string;
  category?: string;
};

const client = new SeismologyServiceClient(getRpcBaseUrl(), { fetch: (...args) => globalThis.fetch(...args) });
// Shorter than the 10-minute natural poll, so every poll asks the server. A
// longer TTL answered polls from the client cache and, once stale, showed the
// old list while refreshing in the background: a new quake appeared one poll
// late, up to two hours after USGS published it.
const breaker = createCircuitBreaker<ListEarthquakesResponse>({ name: 'Seismology', cacheTtlMs: 5 * 60 * 1000, persistCache: true });

const emptyFallback: ListEarthquakesResponse = { earthquakes: [] };
// The poll waits for a stale refresh, so a stalled request would hold back
// the whole natural-events load. At the deadline the saved list is returned.
const EARTHQUAKE_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  if (FREE_HOSTING) {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
      credentials: 'omit', signal: AbortSignal.timeout(EARTHQUAKE_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);
    const data = await response.json();
    return (data.features ?? []).filter((feature: { geometry?: { coordinates?: number[] } }) =>
      feature.geometry?.coordinates?.length === 3 && feature.geometry.coordinates.every(Number.isFinite)
    ).map((feature: { id: string; geometry: { coordinates: number[] }; properties: { place: string; mag: number; time: number; url: string } }) => ({
      id: feature.id, place: feature.properties.place, magnitude: feature.properties.mag,
      depthKm: feature.geometry.coordinates[2],
      location: { latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0] },
      occurredAt: feature.properties.time, sourceUrl: feature.properties.url, source: 'usgs', category: 'earthquake',
    }));
  }
  const hydrated = getHydratedData('earthquakes') as ListEarthquakesResponse | undefined;
  if (hydrated?.earthquakes?.length) {
    breaker.recordSuccess(hydrated);
    return hydrated.earthquakes as Earthquake[];
  }

  const response = await breaker.execute(async () => {
    return client.listEarthquakes(
      { minMagnitude: 0, start: 0, end: 0, pageSize: 0, cursor: '' },
      { signal: AbortSignal.timeout(EARTHQUAKE_REQUEST_TIMEOUT_MS) },
    );
  }, emptyFallback, { shouldCache: (r) => r.earthquakes.length > 0, staleRefreshMode: 'await' });
  return response.earthquakes as Earthquake[];
}

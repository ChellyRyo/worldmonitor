# This fork's free static deployment

`world.chelly.site` deploys the World Monitor browser dashboard on Vercel Hobby,
with DNS managed by Cloudflare. It needs no personal server or API secrets.

The deployed profile uses `VITE_FREE_HOSTING=true`. It retains the public map,
world clock, a limited catalogue of news sources, and browser-fetched USGS
magnitude 2.5+ earthquakes from the past day. News XML is captured during each
deployment; article publication dates remain the publisher's dates. The banner
shows the snapshot generation time and the number of available sources. Reloading
the page does not update those news snapshots: redeploy the project to refresh.
Failed publishers remain unavailable. Upstream feeds and USGS can be unavailable.

AI, market feeds, aircraft/ship tracking, account features, and backend-dependent
panels are unavailable on this deployment. The original API authentication is
preserved in source. `.vercelignore` excludes the APIs and middleware from this
static deployment, so it uses zero server functions. Existing dashboard panels
may be added in settings, but backend-dependent ones cannot provide data.

`vercel.full.json` preserves the original deployment configuration. To restore the
full stack, restore that configuration to `vercel.json`, remove the free-only
ignore entries, and supply the documented backend services and credentials.

The modified source is public at <https://github.com/ChellyRyo/worldmonitor> and
remains under the repository's AGPL license.

# NIED Strong Motion Monitor Policy

**Status: POLICY ONLY — no kmoni GIF retrieval, image decoding, or pixel extraction is implemented in EarthScope.**

This document separates technical feasibility from permission. It is not legal advice and does not grant any data rights.

Official terms reviewed: <https://www.kyoshin.bosai.go.jp/ja/about_kmoni/> (retrieved 2026-11-09).

## 1. Official terms: what is explicit, inferred, or unclear

The official page states, in substance:

- NIED holds copyright in the strong-motion monitor content, except content owned by other providers.
- Copying all or part of the content is prohibited except for private use or quotation and other uses permitted by copyright law.
- Reprinting, modifying, transmitting, or redistributing copied content is strongly discouraged/prohibited.
- Detection of color changes at individual observation points and extraction of observation values from colors are described as uses not intended by NIED.
- Publishing or distributing information processed in such unintended ways is requested to be refrained from.
- Only `http://www.kmoni.bosai.go.jp` is the official monitor service; third-party services are not official.
- EEW source information use is also subject to the Weather Service Act and related restrictions.

The terms do not enumerate every engineering operation. The following classification is therefore deliberate.

| Operation | Official text | Classification | EarthScope position |
|---|---|---|---|
| Direct retrieval of the official GIF | Terms apply to content; no explicit API/automation clause was found | **Unclear; permission should be confirmed** | Not implemented |
| Simple private display | Copying for private use is excepted from the copying prohibition | **Private use may be possible; public display is not established** | Web: official link only; desktop: not implemented |
| Local image decoding | Not explicitly named | **Unclear** | Not implemented |
| Local color/change detection | Described as not intended; publication/distribution requested to be refrained from | **Explicitly discouraged for publication/distribution; private-use boundary unclear** | Not implemented |
| Extracting numerical observation values from colors | Same as above; also cited as a reason individual color changes are inappropriate | **Explicitly discouraged for publication/distribution; private-use boundary unclear** | Not implemented |
| Publishing analysis results | Publication/distribution of processed information is requested to be refrained from | **Permission required** | Not implemented |
| Redistributing images or data | Reprinting, transmission, and redistribution are prohibited | **Explicitly prohibited** | Never implemented |
| Embedding the function in a distributed desktop app | Not explicitly named | **Unclear; should be included in a permission request** | Not implemented |
| Web HTTPS page fetching the HTTP GIF | Mixed Content blocks the request in browsers | **Technical constraint, independent of terms** | Not used; no relay |
| Desktop native HTTP + local processing | Technically possible | **Technically feasible; terms still apply** | Extension point only; not implemented |

The distinction is important:

- **“Not confirmed as permitted”** is not the same as **“technically impossible.”**
- **“Other apps do it”** is not evidence of permission.
- **“Private use may be excepted”** does not automatically cover public distribution of an app or its derived results.

## 2. Technical feasibility by platform

### Web / GitHub Pages

- The app is served over HTTPS.
- The official kmoni image endpoint is documented as HTTP.
- Browsers block an HTTPS page from directly loading an HTTP image as Mixed Content.
- A browser-side proxy or an external relay would introduce transmission/redistribution concerns and is not adopted.
- Therefore the Web version remains **official-link only**; it does not fetch or process the image.

### Desktop / Tauri

A desktop app can technically:

- make an HTTP request from native code,
- decode the returned GIF locally,
- display the frame locally,
- perform local pixel analysis.

That does not change the NIED terms. It only removes the browser Mixed Content restriction. The app must still be assessed against the terms and, in practice, should not ship the processing feature until permission is confirmed.

**EarthScope does not currently implement this desktop path.**

## 3. Survey of similar applications

This survey records what public sources show. It does not establish that any app has permission.

| Application | Public implementation evidence | Data path / behavior | Permission evidence found |
|---|---|---|---|
| KyoshinEewViewer for ingen | C# source is public (MIT for code) | Direct HTTP connection to `www.kmoni.bosai.go.jp:80`; decodes the image with Skia (`SKBitmap.Decode`), samples observation-point pixels, and converts colors to intensity | No data-permission statement found in the README; the MIT license is for code only |
| EQMonitor | Flutter/Dart source is public (MIT for code); `kyoshin_monitor_image_parser` and `kyoshin_monitor_api` are visible | The API client base URL is `http://www.kmoni.bosai.go.jp`; the parser decodes GIF data and reads observation-point pixels; a private backend submodule also exists | README directs users to the app terms and warns that displayed values are reference values; no NIED data permission found |
| JQuake | Official site describes it as using NIED strong-motion data; public source repository was not located from the official site searches performed | The official site's current notice says that, following an NIED terms update, EEW requires DM-D.S.S and per-station intensity/acceleration numerical information is no longer displayed | The official terms require compliance with NIED's usage conditions; this is an example of an app reducing numerical extraction/display, not proof of permission |
| Quarog | The public `software-quarog` repository contains the website, terms, and policy pages; application source was not found | Cannot verify the image retrieval or processing method from public source | No NIED permission statement found |

### Conclusion from the survey

- Direct HTTP retrieval and local pixel extraction are used by at least two public codebases.
- That is evidence of **feasibility**, not evidence of **authorization**.
- At least one project publicly states that it stopped displaying per-station numerical values after a terms update. This reinforces that the terms have practical effect.
- Quarog cannot be assessed without source.
- None of the surveyed code licenses grant rights to NIED content.

## 4. EarthScope decision

### Web

- Keep the official monitor link and the JMA intensity summary.
- Do not fetch, embed, decode, or process the kmoni GIF.
- Do not add a relay/proxy to work around Mixed Content.

### Desktop

- Record that native HTTP and local processing are technically possible.
- Do not implement the feature until permission is confirmed.
- Do not use a hidden/undocumented feature flag to ship the same functionality.
- Keep the user-facing behavior as the official-link panel until permission is obtained.
- If permission is obtained, implement it only under the conditions in section 5.

### Prohibited now

- Vercel, edge, or other third-party relay for kmoni images.
- Bundling kmoni images or extracted values in the repository or installer.
- Publishing or distributing kmoni-derived values without permission.
- Treating the existence of another client as permission.

## 5. Questions to NIED before implementation

Ask in writing and retain the response. At minimum:

1. May a desktop application directly retrieve the official GIF over HTTP?
2. Are there restrictions on request interval, concurrency, User-Agent, Referer, or automated access?
3. May the app decode the GIF and display it locally without transmitting it elsewhere?
4. May the app display a locally processed overlay (for example, smoothed or highlighted intensity) to the user?
5. May the app retain frames in memory or on disk? For how long?
6. May the app extract per-station numerical values locally? May those values be shown to the user? May they be logged?
7. May the app publish or transmit processed values, or only display them locally?
8. May the app be distributed as a ZIP/portable desktop build while fetching the GIF at runtime and bundling no NIED content?
9. What attribution, disclaimer, and update/withdrawal obligations apply?
10. Is there an official API or a licensed distribution channel that should be used instead?
11. Does the intended use interact with the Weather Service Act or EEW restrictions?
12. What happens if NIED changes the image format, URL, or terms?

## 6. Architecture extension point (not implemented)

When permission is obtained, keep the boundary explicit:

```text
StrongMotionPanel
  -> StrongMotionSource (interface)
       -> OfficialLinkSource       (current, always available)
       -> KmoniDesktopSource       (future, permission-gated)
            -> native HTTP fetch
            -> local GIF decode
            -> local frame model
```

Rules for a future implementation:

- `KmoniDesktopSource` must not exist in the default public build until permission is documented.
- The desktop path must not use a relay server.
- Image bytes and derived values must not be published or redistributed beyond the permission.
- The source must expose provenance: provider, retrieval time, endpoint, image time, units, and whether the value is observed or derived.
- The UI must distinguish the official image view from EarthScope-derived analysis.
- The app must handle endpoint/format changes without breaking the core catalog.
- The Web build must never gain a hidden proxy path.

## 7. Change log for this policy

- 2026-11-09: Re-reviewed the official terms and surveyed public implementations. Formalized the distinction between technical feasibility, permission, and current implementation. No kmoni processing feature was added.

# Hello, World

A tiny internet experiment about the people arriving while you are here.

Stay for as long as you like. Around four new lives begin every second, while the globe and the quiet story continue in one full-screen composition.

Each light represents one statistically simulated birth based on demographic projections from the United Nations. The experience is deliberately small: no accounts, feed, dashboard, AI, backend, or live-birth claim.

## Run locally

```bash
pnpm install
pnpm dev
```

The same scripts work with npm:

```bash
npm install
npm run dev
```

For a production build and local preview:

```bash
npm run build
npm run preview
```

## Data path

The production data is static and generated at build time:

1. `scripts/download-un-data.sh` downloads the official UN Data Portal responses for indicator `57`, `Total births by sex`, `Both sexes`, `2026`, `Median`, plus the location metadata.
2. `scripts/prepare-birth-data.ts` filters the source rows, keeps country/area records, sums annual births, calculates country weights, and derives `lambdaGlobal` from 365 days.
3. The script writes the frontend asset to `src/data/births-2026.json`.

The downloaded source files are kept in `data/source/` so the prepared asset can be audited or regenerated. To refresh them intentionally:

```bash
npm run data:download
npm run prepare-data
```

The current checked-in preparation contains 236 country/area records, `132,503,451` projected births for 2026, and `4.2016568683` expected births per second.

Canonical source: [UN World Population Prospects 2024 Revision](https://population.un.org/wpp/). The portal API documentation is available at [population.un.org/dataportalapi](https://population.un.org/dataportalapi/index.html).

## Simulation

`src/simulation/birthProcess.ts` models inter-arrival times with an exponential distribution, so events do not arrive on an artificial fixed interval. The first delay is capped at 900ms to satisfy the experience requirement that the globe becomes active within the first second; later delays use the sampled Poisson process without a warm-start cap.

For every event:

1. Select a country with a cumulative weighted binary search.
2. Sample a valid point inside that country's bundled Natural Earth-derived TopoJSON geometry.
3. Increment the counter from the generated event and render a bounded, fading light.

The app uses d3-geo and a canvas renderer for the smallest stable globe implementation. A compact 110m country geometry is loaded once, the active light list is capped at 500, and no event history is persisted.

The atlas does not expose a distinct polygon for every small UN country/area record. If a selected record has no bundled polygon, the placement function uses the UN location metadata centroid as a conservative visual fallback; it still makes no claim about an actual birth location.

The illustrated night-Earth layer uses decorative static lights that are separate from simulated birth lights. Sound intent is on by default: the app makes a best-effort Web Audio autoplay attempt, then unlocks on the first click, touch, or key press if the browser blocks autoplay. Sparse story beats play only a stylized synthesized newborn cry; there are no giggle cues, external audio files, or recordings. Manual sound-off still takes precedence, and hidden tabs pause the audio context.

## About the numbers

### A small note about the lights

Hello, World is an open-ended statistical simulation, not a live feed of individual births or a one-minute countdown.

I made it because nothing in the world feels more meaningful than the beginning of a new life. Nothing feels more enduring than the birth of a child.

Hey! I'm Iryna Solovyova, a product builder who creates products for the sheer joy of building, this one included. Feel free to say hi if you'd like to collaborate or share feedback. [Find me on LinkedIn.](https://ca.linkedin.com/in/irynasolovyova)

The simulation uses demographic projections from the United Nations World Population Prospects 2024 Revision. For 2026, the source data sums to roughly 132.5 million births worldwide - approximately 4.2 every second.

## Deployment

The production branch is `main` in [`isolovyova/hello-world`](https://github.com/isolovyova/hello-world). Vercel deploys new commits automatically. The Vercel configuration serves this project at `/hello-world` and proxies the other domain paths to the existing Lovable site while the domain migration is incremental.

## Lifecycle, mobile, and accessibility

- The simulation and active-session timer pause when the tab is hidden and resume when it becomes visible; missed background events are not backfilled.
- There is no completion moment or final count: `Hello, World.` stays in place, the story continues in a quiet three-minute loop, and the live count keeps growing.
- The story is an open-ended active session. The twelve beats last fifteen seconds each and repeat intentionally without resetting the count.
- `About the numbers` is the methodology entry point. Country lines are expected averages from UN projections, not live reports.
- The layout uses a full-screen globe with narrative over its lower veil, portrait-specific globe scaling, safe-area insets, and no horizontal scroll.
- `prefers-reduced-motion` stops globe rotation and shortens light animation while keeping the simulation and counter functional.
- The methodology overlay is keyboard reachable and has an explicit close control.

## Validation

Run the focused test suite:

```bash
npm test
```

The tests cover prepared-data filtering and totals, normalized weights, exponential timing, a 100,000-event country-distribution check, and point containment for large and island/multi-island countries. `npm run validate` regenerates the prepared asset and then runs the same checks.

## Files

- [`SPEC.md`](./SPEC.md) — the recovered Product + Implementation Spec supplied in the referenced conversation.
- [`methodology.md`](./methodology.md) — the public-facing methodology copy and limitations.
- [`scripts/download-un-data.sh`](./scripts/download-un-data.sh) — official source download path.
- [`scripts/prepare-birth-data.ts`](./scripts/prepare-birth-data.ts) — deterministic source transformation.
- [`src/data/births-2026.json`](./src/data/births-2026.json) — generated frontend data.

### Spec provenance

`SPEC.md` contains the edited Product + Implementation Spec supplied in the referenced conversation and used as the source of truth for V0.1.

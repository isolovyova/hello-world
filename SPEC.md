# Hello, World

## Product + Implementation Spec

Version 0.1

### 1. Product idea

**Hello, World** is a tiny internet experiment about the people arriving in the world while you are here.

The experience should feel quiet, human, and slightly hypnotic.

A visitor opens the site.

A dark globe fills most of the screen.

Small lights begin appearing around the world. Each light represents one statistically simulated birth.

There is no feed, account, map legend, country dashboard, or interaction required.

The visitor is simply invited to stay for one minute.

At the end of that minute, the site reveals how many simulated lives began while they were there. However, the experience should begin immediately on load: the globe appears instantly and birth events start within the first second, so the user never has to wait for the 60-second cycle to feel active.

The emotional idea:

> No matter what is happening in the world, babies continue to be born, the Earth keeps turning, life keeps appearing, and joy quietly persists.\
> We will probably never know these people.\
> But from this moment on, we share the world with them.

---

# 2. Product principle

This is **not a population dashboard**.

Do not add features simply because the underlying demographic data makes them possible.

The primary rule:

> If a feature does not make the 60-second experience more emotionally legible, do not build it.

The product should feel closer to an internet artwork than to Worldometer.

---

# 3. Core experience

## Initial state

Full viewport.

Very dark background.

A globe occupies most of the screen.

No onboarding modal.

No navigation.

No visible timer.

Initial copy:

> **Hello, world.**

Then, after a short moment:

> **Stay for a minute.**

This is text, not a button.

The simulation starts automatically.

---

# 4. Birth visualization

Small lights begin appearing on the globe.

Each light represents **one simulated birth event**.

The lights should:

- appear softly, not pop aggressively
- have a subtle glow
- remain visible briefly
- fade slowly
- occasionally overlap
- feel organic rather than rhythmic
- avoid bright neon / gaming aesthetics

Do not show country names.

Do not show timestamps.

Do not imply that an exact real-world birth was observed.

Never display copy such as:

> India · 18:04:32

or:

> A baby was just born in Delhi.

The site models births statistically. It does not receive live birth reports.

---

# 5. Live counter

A small line of text should remain visible near the bottom of the screen.

Example:

> **37 lives have begun since you arrived.**

The number increments once for every generated simulation event.

Do not calculate the counter as:

```text
elapsed time × average birth rate
```

Increment the value from actual simulated events:

```text
counter += 1
```

This means different sessions will naturally have slightly different totals after one minute.

That variance is intentional.

---

# 6. One-minute moment

Do not show a countdown.

Internally, track session duration.

After 60 seconds, transition gently into the final moment.

The globe should remain visible in the background and births may continue appearing.

Main copy:

> **While you were here, 257 lives began.**

Use the actual simulation count for that session.

Then:

> You don't know their names.\
> You will probably never meet them.\
> But you're sharing the world now.

Final line:

> **Hello, world.**

Optional quiet continuation:

> stay a little longer

This should not require a click.

If the user stays, the simulation continues normally.

Do not repeat the one-minute ending.

---

# 7. Data source

Use:

**United Nations, Department of Economic and Social Affairs, Population Division**

Dataset:

**World Population Prospects 2024 Revision**

Indicator:

**Total births by sex**

Configuration:

```text
Indicator: Total births by sex
Indicator ID: 57
Short name: TBirths
Sex: Both sexes
Year: 2026
Projection variant: Median
Geography: countries / areas
```

Use the official UN source data as the canonical input.

Do not manually hard-code approximate values from articles or secondary websites.

The production `births-2026.json` must be generated from the downloaded UN dataset.

---

# 8. Why 2026

The site represents the current year.

For version 0.1 use UN's **2026 median projection**.

Do not describe the simulation as a real-time UN data feed.

Preferred wording:

> **A statistical simulation based on United Nations population projections.**

The UN data should be transformed into static assets during development/build time.

No live UN API dependency is needed.

---

# 9. Data preprocessing

Create a script that converts the source UN dataset into a small frontend-friendly JSON file.

Suggested:

```text
/scripts/prepare-birth-data.ts
```

Output:

```text
/src/data/births-2026.json
```

Suggested schema:

```json
{
  "source": "UN World Population Prospects 2024",
  "year": 2026,
  "variant": "Median",
  "worldBirths": 132500000,
  "countries": [
    {
      "iso3": "IND",
      "name": "India",
      "annualBirths": 23000000,
      "weight": 0.1736
    },
    {
      "iso3": "NGA",
      "name": "Nigeria",
      "annualBirths": 7700000,
      "weight": 0.0581
    }
  ]
}
```

The numbers above are examples only.

Generate all production values directly from the UN source file.

Compute:

```text
worldBirths =
Σ annualBirths(country)
```

Then:

```text
countryWeight =
annualBirths(country) / worldBirths
```

Validate:

```text
Σ countryWeight ≈ 1
```

Allow tiny floating-point error.

---

# 10. Global birth rate

Compute the global simulation rate from the dataset.

2026 has:

```text
365 days
31,536,000 seconds
```

Formula:

```text
lambdaGlobal =
worldAnnualBirths / 31,536,000
```

Expected magnitude:

```text
~4.2 births / second
~252 births / minute
```

Do not hard-code `4.2` if it can be derived from the dataset.

---

# 11. Birth timing model

Do NOT use a fixed interval such as:

```typescript
setInterval(createBirth, 238)
```

That creates an artificial rhythm.

Model global births as a homogeneous Poisson process.

If:

```text
λ = expected births per second
```

then the time until the next simulated event follows an exponential distribution:

```text
Δt ~ Exponential(λ)
```

Implementation:

```typescript
function sampleNextDelaySeconds(lambda: number): number {
  const u = Math.random();
  return -Math.log(u) / lambda;
}
```

Equivalent formulation is acceptable.

For each event:

```text
1. Generate delay from exponential distribution
2. Wait for delay
3. Generate one birth
4. Increment counter
5. Schedule next event
```

Do not schedule thousands of events in advance.

Generate events progressively.

---

# 12. Country selection

For every generated birth event, choose one country probabilistically.

Probability:

```text
P(country = i) =
annualBirths[i] / worldAnnualBirths
```

Implement weighted random selection.

Pseudo-code:

```typescript
function selectCountry(countries) {
  const random = Math.random();

  let cumulative = 0;

  for (const country of countries) {
    cumulative += country.weight;

    if (random <= cumulative) {
      return country;
    }
  }

  return countries[countries.length - 1];
}
```

A more efficient cumulative-array + binary-search implementation is welcome but not necessary for V0.1.

---

# 13. Geographic location inside a country

The UN dataset tells us the country where a simulated event should be assigned.

It does **not** provide the location of births within each country.

Use country polygon data such as Natural Earth / GeoJSON / TopoJSON.

For each birth:

```text
selected country
↓
country polygon
↓
random valid point inside polygon
↓
latitude / longitude
↓
render point on globe
```

The point must fall inside the selected country's land polygon.

For countries containing multiple polygons / islands, handle MultiPolygon geometry.

Large countries should naturally display points across the country rather than repeatedly using the centroid.

Do not simply add random latitude/longitude noise around the country centroid.

---

# 14. Geographic limitation

V0.1 assumes births are uniformly distributed across each country's land area.

This is intentionally approximate.

Real populations are not geographically uniform.

Do not add population-density raster weighting in V0.1.

That may become a future improvement.

The methodology must disclose this limitation.

---

# 15. Rendering

Suggested stack:

```text
Vite
React
TypeScript
globe.gl or Three.js
GeoJSON / TopoJSON
```

Preference: choose the simplest stable implementation.

Avoid unnecessary framework complexity.

No backend.

No database.

No authentication.

No server-side rendering requirement.

The app should be deployable as a static site.

---

# 16. Globe visual direction

The globe should feel atmospheric rather than technical.

Requirements:

- dark background
- dark earth
- minimal or invisible country borders
- no country labels
- no data legend
- no lat/lon grid
- slow automatic rotation
- no visible zoom controls
- no visible map controls
- full-screen composition

Desktop:

The globe may respond subtly to pointer dragging.

Mobile:

Touch interaction should not be required.

The passive experience must work perfectly without user interaction.

---

# 17. Birth light behavior

Each simulated birth creates one light.

Suggested behavior:

```text
fade in: 150–300 ms
hold: 1–2 sec
fade out: 2–5 sec
```

Exact values can be tuned visually.

Avoid leaving every previous dot on screen permanently.

Otherwise high-birth-rate countries will become visually saturated.

Use bounded active-point storage.

For example:

```text
maxActivePoints = 500
```

or remove points after their animation completes.

Performance is more important than maintaining visual history.

---

# 18. Animation philosophy

Do not use:

- fireworks
- particle explosions
- bouncing
- confetti
- pulsing country boundaries
- dramatic camera movements
- flashy transitions

The product should feel alive, not gamified.

---

# 19. Optional micro-copy during the minute

Most of the experience should remain quiet.

Occasionally, approximately every 8–15 seconds, a short line may appear briefly.

Possible copy:

> **Someone was just born.**

> **Another life begins.**

> **Somewhere, a first breath.**

Do not cycle copy mechanically.

Do not show a message for every birth.

Do not show more than one message at a time.

These messages are optional if they make the experience feel busier.

Default toward less copy.

---

# 20. Methodology link

Provide a subtle link:

> **How does this work?**

It can open a minimal overlay or separate `/methodology` page.

Copy:

## How this works

Hello, World is a statistical simulation, not a live feed of individual births.

The simulation uses demographic projections from the United Nations World Population Prospects 2024 Revision.

For 2026, the UN projects roughly 132 million births worldwide, approximately 4.2 births every second.

The simulation uses those estimates in two ways:

**Timing**

Birth events are generated statistically using the expected global birth rate.

**Country**

Each simulated birth is assigned to a country in proportion to that country's projected number of births.

**Location**

Within each selected country, the location of the light is randomly generated inside the country's geographic boundaries.

The lights do not represent identifiable people or actual reported births.

Locations within countries are approximate and should not be interpreted as real birth locations.

Data source:

United Nations, Department of Economic and Social Affairs, Population Division, World Population Prospects 2024 Revision.

---

# 21. Footer methodology note

Keep a tiny persistent disclosure somewhere unobtrusive:

> *A statistical simulation based on UN population projections.*

Do not let it compete visually with the experience.

---

# 22. Mobile behavior

Mobile is first-class.

Requirements:

- full viewport
- no horizontal scroll
- globe fits screen
- readable counter
- final copy remains readable
- methodology accessible
- animation remains smooth
- supports modern Safari and Chrome
- respects safe-area insets

Do not shrink the desktop composition blindly.

Tune typography and globe scale for portrait screens.

---

# 23. Accessibility

Respect:

```css
prefers-reduced-motion
```

For reduced motion:

- stop automatic globe rotation
- reduce fade animation
- continue showing birth events
- keep simulation fully functional

Text should have sufficient contrast.

Methodology must be keyboard accessible.

Do not rely only on animation to communicate the counter or final result.

---

# 24. Page lifecycle

When browser tab becomes hidden:

Preferred V0.1 behavior:

Pause visual simulation.

When tab becomes visible again:

Resume from that moment.

Do not generate thousands of missed events retroactively.

The experience represents the time a user is actively present.

Use:

```text
document.visibilityState
```

to manage this behavior.

The 60-second experience timer should also count active visible time rather than background-tab time.

---

# 25. Session behavior

On page refresh:

Start a new experience.

No persistence required.

No cookies required.

No account.

No local storage required.

---

# 26. Analytics

Do not build an analytics dashboard.

If lightweight product analytics are added later, possible events:

```text
session_started
one_minute_completed
methodology_opened
session_duration
```

But analytics are explicitly optional for V0.1.

Do not delay launch for analytics.

---

# 27. Performance

Target:

- usable on mid-range mobile hardware
- smooth animation at normal birth rate
- no memory growth during long sessions
- no accumulating thousands of DOM nodes
- geometry loaded once
- data files compressed / optimized

Prefer rendering points in WebGL rather than creating HTML elements for each birth.

---

# 28. Repository structure

Suggested:

```text
hello-world/
├── README.md
├── package.json
├── vite.config.ts
├── public/
│
├── scripts/
│   └── prepare-birth-data.ts
│
├── src/
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── WorldGlobe.tsx
│   │   ├── BirthCounter.tsx
│   │   ├── FinalMoment.tsx
│   │   └── Methodology.tsx
│   │
│   ├── simulation/
│   │   ├── birthProcess.ts
│   │   ├── weightedCountry.ts
│   │   └── randomPointInCountry.ts
│   │
│   ├── data/
│   │   ├── births-2026.json
│   │   └── countries.geojson
│   │
│   ├── hooks/
│   │   └── useActiveSessionTime.ts
│   │
│   └── styles/
│       └── global.css
│
└── methodology.md
```

Adjust structure if the implementation benefits from simplification.

Do not create unnecessary abstractions.

---

# 29. Suggested TypeScript model

```typescript
type CountryBirthData = {
  iso3: string;
  name: string;
  annualBirths: number;
  weight: number;
};

type BirthDataset = {
  source: string;
  year: number;
  variant: string;
  worldBirths: number;
  countries: CountryBirthData[];
};

type BirthEvent = {
  id: string;
  timestamp: number;
  iso3: string;
  lat: number;
  lng: number;
};
```

No personal data exists in the system.

---

# 30. Simulation module API

Suggested API:

```typescript
createBirthSimulation({
  lambda,
  onBirth,
  isActive
});
```

Example:

```typescript
const simulation = createBirthSimulation({
  lambda: worldBirths / 31_536_000,

  onBirth: () => {
    const country = selectCountry(countries);
    const coordinates = randomPointInCountry(country.iso3);

    addBirth({
      country,
      ...coordinates
    });
  }
});
```

Return controls such as:

```typescript
simulation.start();
simulation.pause();
simulation.resume();
simulation.stop();
```

Keep the simulation logic independent from React rendering where practical.

---

# 31. Validation

Before shipping, verify statistically that the implementation behaves correctly.

## Birth rate test

Run simulation without animation for a large synthetic period.

Expected:

```text
mean simulated births / second ≈ lambdaGlobal
```

Do not expect exact equality.

---

## Country distribution test

Generate at least:

```text
100,000 simulated births
```

Compare simulated country shares with expected weights.

For major countries, distributions should converge near target values.

Example:

```text
expected India weight: 17.x%
observed: approximately 17.x%
```

Do not require exact matching.

---

## Geographic test

Sample points for multiple countries.

Verify every point is contained within the correct country's polygon.

Test:

- large Polygon
- MultiPolygon
- island nations
- countries crossing ±180° longitude if relevant

---

# 32. Acceptance criteria

V0.1 is complete when:

1. User can open the URL with no onboarding.
2. Globe appears and simulation starts automatically.
3. Birth events happen at statistically variable intervals.
4. Long-run mean birth rate matches the UN-derived global rate.
5. Every birth selects a country using UN-derived country weights.
6. Every rendered point falls inside that country's polygon.
7. Counter increments from actual simulated events.
8. No countdown is visible.
9. After 60 seconds of active viewing, the final moment appears.
10. Final count uses the actual session count.
11. Simulation may continue after the final message.
12. Methodology clearly explains that the experience is simulated.
13. Works well on desktop and mobile.
14. No backend exists.
15. No login exists.
16. No demographic dashboard exists.
17. No AI feature exists.
18. Page remains performant during long sessions.

---

# 33. Explicit non-goals

Do NOT build in V0.1:

- accounts
- authentication
- profiles
- user-generated content
- AI
- LLM integration
- chatbot
- deaths
- live global population counter
- historical trends
- fertility charts
- demographic charts
- country statistics pages
- search
- filters
- date picker
- country picker
- leaderboards
- social feed
- comments
- personalized experience
- notifications
- admin panel
- database
- backend
- subscriptions
- payments

---

# 34. Potential future versions

Do not implement now.

Possible later experiments:

### V0.2

Population-density-weighted birth locations.

### V0.3

Optional sound design.

### V0.4

Shareable final card:

> While I was here for one minute,\
> 254 lives began.

### V0.5

A special birthday experience:

> Since you were born, approximately X billion other lives have begun.

These are ideas only.

Keep them out of V0.1.

---

# 35. README

Suggested README:

# Hello, World

A tiny internet experiment about the people arriving while you're here.

Stay for a minute.

Around four new lives begin every second.

Each light you see represents one statistically simulated birth, based on demographic projections from the United Nations.

No accounts.\
No feed.\
No AI.

Just one minute on Earth.

## How it works

Hello, World uses projected annual births from the UN World Population Prospects 2024 Revision.

Birth timing is modeled statistically and countries are selected according to their share of projected births.

The visualization is a simulation. It does not represent actual individual birth reports.

## Built with

- React
- TypeScript
- Three.js / globe.gl
- UN World Population Prospects data
- geographic boundary data

## Why

Because sometimes a number becomes more meaningful when you sit with it for a minute.

---

# 36. Visual tone

Keywords:

```text
quiet
human
dark
warm
spacious
minimal
slightly poetic
scientific underneath
not scientific-looking
```

Avoid:

```text
dashboard
cyberpunk
space-game
AI aesthetic
startup landing page
data visualization demo
Worldometer.

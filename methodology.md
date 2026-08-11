# How this works

Hello, World is an open-ended statistical simulation, not a live feed of individual births or a one-minute countdown.

The simulation uses demographic projections from the United Nations World Population Prospects 2024 Revision.

For 2026, the downloaded UN source contains 132,503,451 projected births worldwide — approximately 4.2 births every second when divided across 365 days.

The simulation uses those estimates in three ways:

**Timing**

Birth events are generated progressively from an exponential inter-arrival distribution using the expected global birth rate. This produces a Poisson process rather than a fixed visual rhythm.

**Country**

Each simulated birth is assigned to a country in proportion to that country's projected number of births.

## The story

The full-screen story repeats intentionally while you stay. `Hello, World.` remains the permanent title while twelve short beats move through the lower part of the globe in a three-minute loop. There is no completion moment, frozen final count, reset, or terminal screen. Country story beats convert projected annual births into an expected average per minute; they are not live country reports. The philosophical lines are original writing, not attributed quotations.

`About the numbers` is the methodology entry point from the experience. It explains the source, simulation, country weighting, and the limits of the visual metaphor.

The sound is optional and off by default. When enabled, sparse story beats can play abstract synthesized baby-cry and giggle cues, with a softer first-breath fallback. They are not recordings of a particular child or a live birth. Dim background lights are decorative night-Earth texture; only the brighter birth lights affect the counter.

## Why I made this

Nothing in the world feels more meaningful than the beginning of a new life. Nothing feels more enduring than the birth of a child.

Hey! I'm Iryna Solovyova, a product builder who creates products for the sheer joy of building, this one included. Feel free to [say hi on LinkedIn](https://ca.linkedin.com/in/irynasolovyova) if you'd like to collaborate or share feedback.

## Data source and preparation

The canonical source is [United Nations, Department of Economic and Social Affairs, Population Division — World Population Prospects 2024 Revision](https://population.un.org/wpp/), using the official portal's:

```text
Indicator: Total births by sex
Indicator ID: 57
Short name: TBirths
Sex: Both sexes
Year: 2026
Projection variant: Median
Geography: countries / areas
```

The source responses are stored in `data/source/`. `scripts/prepare-birth-data.ts` selects exactly those rows, joins country metadata, calculates:

```text
worldBirths = Σ annualBirths(country)
countryWeight = annualBirths(country) / worldBirths
lambdaGlobal = worldBirths / 31,536,000
```

The browser uses only the generated static file `src/data/births-2026.json`; it has no live UN API dependency.

## Limitations

This is an artwork built from population estimates. It does not observe individual births, provide real-time reporting, or model the geographic distribution of births within a country. Country polygons are used to place plausible visual points, not to make claims about actual birth locations.

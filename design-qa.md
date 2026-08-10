final result: passed

# Design QA

Date: 2026-08-10

## Visual source and implementation evidence

- Source visual truth: `/var/folders/mw/b6dnxp0s49dg48bybqwthkv00000gn/T/TemporaryItems/NSIRD_screencaptureui_AXGzZa/Screenshot 2026-08-10 at 10.14.20 AM.png`
- Source pixels: `1716 x 1500` PNG capture.
- Final tall implementation capture: `/private/tmp/hello-world-design-final-tall-1716x1500.png`
- Final desktop implementation capture: `/private/tmp/hello-world-design-final-desktop-1280x720.png`
- Final mobile implementation capture: `/private/tmp/hello-world-design-final-mobile-390x844.png`
- The browser capture service returned the tall implementation PNG at `1716 x 1268`; its CSS viewport and DOM geometry were `1716 x 1500`.
- Desktop CSS viewport: `1280 x 720`; mobile CSS viewport: `390 x 844`.

The source reference and the tall implementation capture were opened together for comparison. The source uses a changing globe rotation and changing story state, so the comparison focused on the stable visual system: dark star field, clipped blue globe, lower veil, centered title, gold projection label, cream narrative type, live count, and bottom controls.

## Comparison evidence

### Full view

- The implementation now matches the supplied design direction: the globe fills the page as a dark planetarium-like background instead of occupying a separate upper zone.
- Narrative is composited over the lower part of the globe. `Hello, World.` is permanent; story copy, live count, and controls share the same centered vertical axis.
- The globe uses deep navy space, blue-teal ocean light, dark land, fine country boundaries, sparse stars, orbit lines, warm decorative night lights, and smaller brighter birth pings.
- The lower veil keeps text legible without introducing a final overlay or a second dock panel.

### Focused regions

- Globe: checked rim, scale, clipping at the top/bottom, country-line visibility, night lights, birth pings, and rotation against the reference globe.
- Narrative: checked Caveat Brush title/headline, IBM Plex Mono eyebrow and controls, EB Garamond body/counter, projection wording, and live-count placement.
- Footer: checked `SOUND ON` and `ABOUT THE NUMBERS` labels, underlines, focusable controls, and safe-area spacing.

## Checked states

- Opening state: persistent title, first story beat, live counter, and bottom controls render in the full-screen composition.
- Projection state: the India beat rendered `In India, an average minute holds about 44 expected births.` with the explicit projection label and non-live-report caveat.
- Open-ended state: no terminal overlay or frozen final count is present; the story engine keeps cycling and the count remains event-driven.
- Story engine: automated boundary tests cover 0, 15, 60, 180, and 195 seconds, including cycle index progression and live count interpolation.
- Desktop short viewport: `scrollHeight === innerHeight` at `1280 x 720`; the compact height rule keeps the counter and controls inside the viewport.
- Mobile portrait: `scrollHeight === innerHeight` at `390 x 844`; the globe, story, counter, and controls remain readable with no horizontal scroll.
- Reduced motion: CSS disables long visual transitions and globe rotation while sound remains available.

## Interaction and runtime checks

- Sound starts only after clicking `Turn sound on`, changes to `Turn sound off`, and can be disabled again.
- AudioContext fallback is safe when unavailable; the sound toggle remains usable without console errors.
- `About the numbers` opens the methodology panel and its accessible close control returns to the experience.
- Browser console logs were empty during the production-preview smoke test.
- No `.final-moment`, `finalCount`, or terminal state appears in the rendered experience.

## Automated validation

- `pnpm run test`: 5 files, 13 tests passed.
- `pnpm run build`: production build passed; static data preparation produced 236 countries and 132,503,451 projected births for 2026.

## Findings

No actionable P0, P1, or P2 visual issues remain. The remaining differences are intentional: the globe rotates, birth pings are simulated, and story copy changes over time rather than reproducing a static screenshot state.


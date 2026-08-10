type MethodologyProps = {
  isOpen: boolean;
  onClose: () => void;
  worldBirths: number;
  lambdaGlobal: number;
};

export function Methodology({ isOpen, onClose, worldBirths, lambdaGlobal }: MethodologyProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="methodology-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="methodology-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="methodology-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="methodology-close" type="button" onClick={onClose} aria-label="Close methodology">
          Close
        </button>
        <p className="methodology-kicker">A small note about the lights</p>
        <h2 id="methodology-title">About the numbers</h2>
        <p>Hello, World is an open-ended statistical simulation, not a live feed of individual births or a one-minute countdown.</p>
        <p>
          The simulation uses demographic projections from the United Nations World Population Prospects 2024
          Revision. For 2026, the source data sums to roughly {(worldBirths / 1_000_000).toFixed(1)} million births
          worldwide — approximately {lambdaGlobal.toFixed(1)} every second.
        </p>
        <h3>Timing</h3>
        <p>Birth events are generated statistically using the expected global birth rate.</p>
        <h3>Country</h3>
        <p>Each simulated birth is assigned to a country in proportion to that country&apos;s projected number of births.</p>
        <h3>Location</h3>
        <p>
          Within each selected country, the light is randomly generated inside the country&apos;s geographic boundaries.
          This V0.1 model assumes births are uniformly distributed across land area.
        </p>
        <p>
          The lights do not represent identifiable people or actual reported births. Locations within countries are
          approximate and should not be interpreted as real birth locations.
        </p>
        <p>
          The lower story repeats intentionally while you stay. Country story beats use projected annual births
          converted into an expected average per minute; they are not live country reports.
        </p>
        <h3>Sound</h3>
        <p>
          Sound is optional and off by default. When enabled, the site uses a quiet synthesized first-breath texture;
          it is not a recording of a particular child or a live birth.
        </p>
        <p>Some dim background lights are decorative night-Earth texture. Only the brighter birth lights affect the counter.</p>
        <p className="methodology-source">
          Data source: United Nations, Department of Economic and Social Affairs, Population Division, World
          Population Prospects 2024 Revision.
        </p>
      </section>
    </div>
  );
}

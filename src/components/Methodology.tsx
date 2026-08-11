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
          I made Hello, World because nothing in the world feels more meaningful than the beginning of a new life.
          Nothing feels more enduring than the birth of a child.
        </p>
        <p>
          Hey! I&apos;m Iryna Solovyova, a product builder who creates products for the sheer joy of building, this one
          included. Feel free to say hi if you&apos;d like to collaborate or share feedback.{' '}
          <a href="https://ca.linkedin.com/in/irynasolovyova" target="_blank" rel="noreferrer">
            Find me on LinkedIn.
          </a>
        </p>
        <p>
          The simulation uses demographic projections from the United Nations World Population Prospects 2024
          Revision. For 2026, the source data sums to roughly {(worldBirths / 1_000_000).toFixed(1)} million births
          worldwide — approximately {lambdaGlobal.toFixed(1)} every second.
        </p>
        <h3>Timing</h3>
        <p>Birth events are generated statistically using the expected global birth rate.</p>
        <h3>Country</h3>
        <p>Each simulated birth is assigned to a country in proportion to that country&apos;s projected number of births.</p>
        <p>
          The lower story repeats intentionally while you stay. Country story beats use projected annual births
          converted into an expected average per minute; they are not live country reports.
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

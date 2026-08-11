type MethodologyProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Methodology({ isOpen, onClose }: MethodologyProps) {
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
        <p>
          Hello, World is an open-ended statistical simulation, not a live feed of individual births or a one-minute
          countdown.
        </p>
        <p>
          I made it because nothing in the world feels more meaningful than the beginning of a new life. Nothing feels
          more enduring than the birth of a child.
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
          Revision. For 2026, the source data sums to roughly 132.5 million births worldwide - approximately 4.2 every
          second.
        </p>
      </section>
    </div>
  );
}

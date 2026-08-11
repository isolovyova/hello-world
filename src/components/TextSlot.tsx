import { useEffect, useRef, useState } from 'react';

/*
 * A slot holds a fixed height and cross-fades its contents, so changing copy
 * never shifts the counter or the footer below it.
 *
 * Entrances are CSS animations that run on mount rather than a class toggled
 * from script: a layer mounting while frames are throttled would otherwise
 * never receive the frame that reveals it, and would sit at zero opacity.
 */

/**
 * How a line arrives:
 * - `words` staggers each word up through a blur
 * - `soft` resolves the whole line out of a blur
 * - `track` settles wide letter-spacing back to its resting value
 */
export type TextEntrance = 'words' | 'soft' | 'track';

export const TEXT_ENTRANCES: readonly TextEntrance[] = ['words', 'soft', 'track'];

/** Slightly outlasts the 2.8s slot-fade-out animation in global.css. */
const EXIT_MS = 2_900;
const WORD_STAGGER_MS = 95;

type Layer = {
  id: number;
  text: string;
  entrance: TextEntrance;
};

type TextSlotProps = {
  text: string;
  /**
   * Changing this swaps in a fresh layer. `text` alone is not enough: the live
   * counter rewrites the headline continuously, and that must not re-animate.
   */
  revision: number;
  entrance: TextEntrance;
  className: string;
  wordDelayMs?: number;
  reducedMotion: boolean;
};

export function TextSlot({
  text,
  revision,
  entrance,
  className,
  wordDelayMs = 0,
  reducedMotion,
}: TextSlotProps) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: revision, text, entrance }]);
  const previousRevision = useRef(revision);

  useEffect(() => {
    if (previousRevision.current === revision) {
      return undefined;
    }

    previousRevision.current = revision;
    setLayers((current) => [...current, { id: revision, text, entrance }]);

    const timer = window.setTimeout(() => {
      setLayers((current) => current.filter((layer) => layer.id === revision));
    }, EXIT_MS);

    return () => window.clearTimeout(timer);
    // `text` and `entrance` are read as the values current at the swap, and must
    // not re-run this effect on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  return (
    <div className={`text-slot ${className}`}>
      {layers.map((layer, index) => {
        const isCurrent = index === layers.length - 1;
        return (
          <SlotLayer
            key={layer.id}
            // The newest layer tracks live text; outgoing layers keep their snapshot.
            text={isCurrent ? text : layer.text}
            entrance={layer.entrance}
            leaving={!isCurrent}
            wordDelayMs={wordDelayMs}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </div>
  );
}

type SlotLayerProps = {
  text: string;
  entrance: TextEntrance;
  leaving: boolean;
  wordDelayMs: number;
  reducedMotion: boolean;
};

function SlotLayer({ text, entrance, leaving, wordDelayMs, reducedMotion }: SlotLayerProps) {
  const className = [
    'text-slot__layer',
    `text-slot__layer--${entrance}`,
    leaving ? 'is-leaving' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-hidden={leaving || undefined}>
      <span className="text-slot__line">
        {entrance === 'words' ? renderWords(text, wordDelayMs, reducedMotion) : text}
      </span>
    </div>
  );
}

function renderWords(text: string, wordDelayMs: number, reducedMotion: boolean) {
  let wordIndex = -1;

  return text.split(/(\s+)/).map((chunk, index) => {
    if (!chunk.trim()) {
      return chunk;
    }

    wordIndex += 1;
    const delay = reducedMotion ? 0 : wordDelayMs + wordIndex * WORD_STAGGER_MS;

    return (
      <span
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className="text-slot__word"
        style={{ animationDelay: `${delay}ms` }}
      >
        {chunk}
      </span>
    );
  });
}

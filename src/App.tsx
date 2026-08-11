import { useEffect, useMemo, useRef, useState } from 'react';
import birthDataset from './data/births-2026.json';
import { BirthCounter } from './components/BirthCounter';
import { Methodology } from './components/Methodology';
import { SoundToggle } from './components/SoundToggle';
import { TEXT_ENTRANCES, TextSlot } from './components/TextSlot';
import { WorldGlobe } from './components/WorldGlobe';
import { createSoundscape, type SoundscapeControls } from './audio/soundscape';
import { useActiveSessionTime } from './hooks/useActiveSessionTime';
import { getStoryBeat, getStoryHeadline, type StoryBeatState } from './narrative';
import { createBirthSimulation } from './simulation/birthProcess';
import { randomPointInCountry } from './simulation/randomPointInCountry';
import { createWeightedCountries, selectCountry } from './simulation/weightedCountry';
import type { BirthDataset, BirthEvent } from './types';
import './styles/global.css';

const dataset = birthDataset as BirthDataset;
const MAX_ACTIVE_POINTS = 500;

// The three lines land in sequence rather than all at once. The story cadence
// stays at fifteen seconds; these delays only shape the quieter reveal.
const HEADLINE_DELAY_MS = 620;
const SUBLINE_DELAY_MS = 1_750;
const HEADLINE_WORD_DELAY_MS = 360;

function newEventId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Holds a story beat back so the eyebrow, headline and subline arrive in sequence.
 * Returns null until the first beat is due, which staggers the opening load too.
 */
function useDelayedStory(story: StoryBeatState, delayMs: number): StoryBeatState | null {
  const [delayed, setDelayed] = useState<StoryBeatState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayed(story), delayMs);
    return () => window.clearTimeout(timer);
  }, [story, delayMs]);

  return delayed;
}

export default function App() {
  const [births, setBirths] = useState<BirthEvent[]>([]);
  const [birthCount, setBirthCount] = useState(0);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(() => document.visibilityState === 'visible');
  const elapsedSeconds = useActiveSessionTime();
  const reducedMotion = useReducedMotion();
  const weightedCountries = useMemo(() => createWeightedCountries(dataset.countries), []);
  const soundscapeRef = useRef<SoundscapeControls | null>(null);
  const soundRequestedRef = useRef(true);
  const unlockCleanupRef = useRef<(() => void) | null>(null);

  const tickingStory = useMemo(() => getStoryBeat(elapsedSeconds, dataset), [elapsedSeconds]);

  // The session clock ticks ten times a second, so pin the object identity to the
  // beat itself — the staged timers below key off it.
  const stableStoryRef = useRef(tickingStory);
  if (stableStoryRef.current.instanceKey !== tickingStory.instanceKey) {
    stableStoryRef.current = tickingStory;
  }
  const currentStory = stableStoryRef.current;

  const headlineStory = useDelayedStory(currentStory, HEADLINE_DELAY_MS);
  const sublineStory = useDelayedStory(currentStory, SUBLINE_DELAY_MS);
  const headlineEntrance = TEXT_ENTRANCES[(headlineStory?.messageIndex ?? 0) % TEXT_ENTRANCES.length];

  useEffect(() => {
    const simulation = createBirthSimulation({
      lambda: dataset.lambdaGlobal,
      isActive: () => document.visibilityState === 'visible',
      onBirth: () => {
        const country = selectCountry(weightedCountries);
        const coordinates = randomPointInCountry(country);
        const birth: BirthEvent = {
          id: newEventId(),
          timestamp: performance.now(),
          iso3: country.iso3,
          m49: country.m49,
          lat: coordinates.lat,
          lng: coordinates.lng,
        };

        setBirthCount((count) => count + 1);
        setBirths((activeBirths) => [...activeBirths.slice(-(MAX_ACTIVE_POINTS - 1)), birth]);
      },
    });

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      if (visible) {
        simulation.resume();
      } else {
        simulation.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (document.visibilityState === 'visible') {
      simulation.start();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      simulation.stop();
    };
  }, [weightedCountries]);

  useEffect(() => {
    const soundscape = createSoundscape();
    soundscapeRef.current = soundscape;
    let disposed = false;

    const removeUnlockListeners = () => {
      unlockCleanupRef.current?.();
      unlockCleanupRef.current = null;
    };

    const attemptEnable = async () => {
      if (disposed || !soundRequestedRef.current) {
        return;
      }

      try {
        await soundscape.enable();
      } catch {
        // Sound is deliberately best-effort. The gesture listeners below give
        // blocked autoplay another chance without interrupting the experience.
      }

      if (disposed || !soundRequestedRef.current) {
        return;
      }

      if (soundscape.isEnabled()) {
        setSoundEnabled(true);
        removeUnlockListeners();
        return;
      }

      if (unlockCleanupRef.current) {
        return;
      }

      const handleGesture = () => {
        void attemptEnable();
      };

      window.addEventListener('pointerdown', handleGesture);
      window.addEventListener('touchstart', handleGesture, { passive: true });
      window.addEventListener('keydown', handleGesture);
      unlockCleanupRef.current = () => {
        window.removeEventListener('pointerdown', handleGesture);
        window.removeEventListener('touchstart', handleGesture);
        window.removeEventListener('keydown', handleGesture);
      };
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        soundscape.pause();
      } else if (soundRequestedRef.current) {
        void attemptEnable();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void attemptEnable();
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeUnlockListeners();
      soundscape.stop();
      soundscapeRef.current = null;
    };
  }, []);

  const handleSoundToggle = async () => {
    const soundscape = soundscapeRef.current;
    if (!soundscape) {
      return;
    }

    if (soundscape.isEnabled()) {
      soundRequestedRef.current = false;
      unlockCleanupRef.current?.();
      unlockCleanupRef.current = null;
      soundscape.disable();
      setSoundEnabled(false);
      return;
    }

    soundRequestedRef.current = true;
    try {
      await soundscape.enable();
    } catch {
      setSoundEnabled(false);
      return;
    }
    const enabled = soundscape.isEnabled();
    setSoundEnabled(enabled);
  };

  return (
    <main className={`experience ${isVisible ? '' : 'experience--paused'}`}>
      <section className="globe-stage" aria-label="The illustrated Earth">
        <WorldGlobe births={births} reducedMotion={reducedMotion} />
      </section>

      <div className="veil" aria-hidden="true" />

      <section className="stage" aria-label="Experience information">
        <h1 className="story-title">Hello, World.</h1>

        <div className="story-beat" aria-live="polite">
          <TextSlot
            className="story-eyebrow"
            text={currentStory.beat.eyebrow}
            revision={currentStory.messageIndex}
            entrance="track"
            reducedMotion={reducedMotion}
          />
          <TextSlot
            className="story-headline"
            text={headlineStory ? getStoryHeadline(headlineStory.beat, birthCount) : ''}
            revision={headlineStory?.messageIndex ?? -1}
            entrance={headlineEntrance}
            wordDelayMs={HEADLINE_WORD_DELAY_MS}
            reducedMotion={reducedMotion}
          />
          <TextSlot
            className="story-body"
            text={sublineStory?.beat.body ?? ''}
            revision={sublineStory?.messageIndex ?? -1}
            entrance="soft"
            reducedMotion={reducedMotion}
          />
        </div>

        <BirthCounter count={birthCount} />

        <div className="foot">
          <SoundToggle enabled={soundEnabled} onToggle={handleSoundToggle} />
          <button className="methodology-link" type="button" onClick={() => setMethodologyOpen(true)}>
            About the numbers
          </button>
        </div>
      </section>

      <Methodology
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import birthDataset from './data/births-2026.json';
import { BirthCounter } from './components/BirthCounter';
import { Methodology } from './components/Methodology';
import { SoundToggle } from './components/SoundToggle';
import { WorldGlobe } from './components/WorldGlobe';
import { createSoundscape, type SoundscapeControls } from './audio/soundscape';
import { useActiveSessionTime } from './hooks/useActiveSessionTime';
import { getStoryBeat, getStoryHeadline } from './narrative';
import { createBirthSimulation } from './simulation/birthProcess';
import { randomPointInCountry } from './simulation/randomPointInCountry';
import { createWeightedCountries, selectCountry } from './simulation/weightedCountry';
import type { BirthDataset, BirthEvent } from './types';
import './styles/global.css';

const dataset = birthDataset as BirthDataset;
const MAX_ACTIVE_POINTS = 500;

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
  const soundEnabledRef = useRef(false);
  const storyBeatRef = useRef('0:one-minute-on-earth');

  const currentStory = useMemo(() => getStoryBeat(elapsedSeconds, dataset), [elapsedSeconds]);
  const storyHeadline = getStoryHeadline(currentStory.beat, birthCount);

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        soundscape.pause();
      } else if (soundscape.isEnabled()) {
        void soundscape.enable().catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      soundscape.stop();
      soundscapeRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (storyBeatRef.current === currentStory.instanceKey) {
      return;
    }

    storyBeatRef.current = currentStory.instanceKey;
    if (soundEnabledRef.current && currentStory.beat.soundCue) {
      soundscapeRef.current?.cueFirstBreath();
    }
  }, [currentStory]);

  const handleSoundToggle = async () => {
    const soundscape = soundscapeRef.current;
    if (!soundscape) {
      return;
    }

    if (soundscape.isEnabled()) {
      soundscape.disable();
      setSoundEnabled(false);
      return;
    }

    try {
      await soundscape.enable();
    } catch {
      setSoundEnabled(false);
      return;
    }
    const enabled = soundscape.isEnabled();
    setSoundEnabled(enabled);
    if (enabled && currentStory.beat.soundCue) {
      soundscape.cueFirstBreath();
    }
  };

  return (
    <main className={`experience ${isVisible ? '' : 'experience--paused'}`}>
      <section className="globe-stage" aria-label="The illustrated Earth">
        <WorldGlobe births={births} reducedMotion={reducedMotion} />
      </section>

      <section className="experience-dock" aria-label="Experience information">
        <div className="story-block">
          <h1 className="story-title">Hello, World.</h1>
          <div className="story-beat" key={currentStory.instanceKey} aria-live="polite">
            <p className="story-eyebrow">{currentStory.beat.eyebrow}</p>
            <p className="story-headline">{storyHeadline}</p>
            <p className="story-body">{currentStory.beat.body}</p>
          </div>
          <BirthCounter count={birthCount} />
          <p className="story-continuation">stay a little longer</p>
        </div>

        <div className="dock-meta">
          <p className="methodology-note">A statistical simulation based on UN population projections.</p>
          <div className="dock-actions">
            <SoundToggle enabled={soundEnabled} onToggle={handleSoundToggle} />
            <button className="methodology-link" type="button" onClick={() => setMethodologyOpen(true)}>
              About the numbers
            </button>
          </div>
        </div>
      </section>

      <Methodology
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
        worldBirths={dataset.worldBirths}
        lambdaGlobal={dataset.lambdaGlobal}
      />
    </main>
  );
}

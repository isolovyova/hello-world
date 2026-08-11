import { describe, expect, it } from 'vitest';
import birthDataset from '../src/data/births-2026.json';
import {
  createStoryBeats,
  getStoryBeat,
  getStoryHeadline,
} from '../src/narrative';
import type { BirthDataset } from '../src/types';

const dataset = birthDataset as BirthDataset;

describe('open-ended story beats', () => {
  it('holds twelve beats for fifteen seconds and repeats after three minutes', () => {
    const beats = createStoryBeats(dataset);

    expect(beats).toHaveLength(12);
    expect(beats.reduce((total, beat) => total + beat.durationSeconds, 0)).toBe(180);
    expect(getStoryBeat(0, dataset).beat.id).toBe('one-minute-on-earth');
    expect(getStoryBeat(14.99, dataset).beat.id).toBe('one-minute-on-earth');
    expect(getStoryBeat(15, dataset).beat.id).toBe('somewhere-right-now');
    expect(getStoryBeat(60, dataset).beat.id).toBe('world-keeps-turning');

    const nextCycle = getStoryBeat(180, dataset);
    expect(nextCycle.beat.id).toBe('one-minute-on-earth');
    expect(nextCycle.cycleIndex).toBe(1);
    expect(getStoryBeat(195, dataset).beat.id).toBe('somewhere-right-now');
    expect(nextCycle.beat.soundCue).toBe('cry');
    expect(getStoryBeat(45, dataset).beat.soundCue).toBe('giggle');
  });

  it('renders the live count inside the count beat', () => {
    const beat = getStoryBeat(0, dataset).beat;

    expect(getStoryHeadline(beat, 273)).toBe('While you were here, 273 lives began.');
    expect(getStoryHeadline(beat, 1)).toBe('While you were here, 1 life began.');
  });

  it('formats country story beats from projected annual births', () => {
    const indiaBeat = getStoryBeat(45, dataset).beat;

    expect(indiaBeat.eyebrow).toBe('From the UN projection');
    expect(indiaBeat.headline).toBe('In India, an average minute holds about 44 expected births.');
    expect(indiaBeat.body).toContain('Not a live report');
  });
});

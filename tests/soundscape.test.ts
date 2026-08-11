import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSoundscape } from '../src/audio/soundscape';

const originalAudio = window.Audio;
let createdPlayer: FakeAudioElement | null = null;

class FakeAudioElement {
  static allowPlay = true;

  src = '';
  preload = '';
  volume = 1;
  paused = true;
  ended = false;
  currentTime = 0;
  private listeners = new Map<string, Array<() => void>>();

  constructor() {
    createdPlayer = this;
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener),
    );
  }

  load() {}

  async play() {
    if (!FakeAudioElement.allowPlay) {
      throw new Error('autoplay blocked');
    }
    this.paused = false;
    this.ended = false;
  }

  pause() {
    this.paused = true;
  }

  removeAttribute(name: string) {
    if (name === 'src') {
      this.src = '';
    }
  }

  finish() {
    this.ended = true;
    this.paused = true;
    for (const listener of this.listeners.get('ended') ?? []) {
      listener();
    }
  }
}

function setAudioConstructor(value: unknown) {
  Object.defineProperty(window, 'Audio', { configurable: true, value });
}

afterEach(() => {
  setAudioConstructor(originalAudio);
  FakeAudioElement.allowPlay = true;
  createdPlayer = null;
  vi.useRealTimers();
});

describe('soundscape', () => {
  it('stays safe when browser audio is unavailable', async () => {
    setAudioConstructor(undefined);
    const soundscape = createSoundscape();

    await expect(soundscape.enable()).resolves.toBeUndefined();
    expect(soundscape.isEnabled()).toBe(false);
    expect(() => soundscape.cue('cry')).not.toThrow();
    soundscape.stop();
  });

  it('plays the five provided recordings in a rotating background', async () => {
    vi.useFakeTimers();
    setAudioConstructor(FakeAudioElement);
    const soundscape = createSoundscape();

    await soundscape.enable();
    expect(soundscape.isEnabled()).toBe(true);
    expect(createdPlayer?.src).toContain('/audio/newborn-cry-01.mp3');

    createdPlayer?.finish();
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    expect(createdPlayer?.src).toContain('/audio/newborn-cry-02.mp3');

    soundscape.pause();
    expect(createdPlayer?.paused).toBe(true);
    await soundscape.enable();
    expect(createdPlayer?.paused).toBe(false);
    soundscape.disable();
    expect(soundscape.isEnabled()).toBe(false);
    soundscape.stop();
  });

  it('resolves safely when autoplay is blocked so a later gesture can retry', async () => {
    setAudioConstructor(FakeAudioElement);
    FakeAudioElement.allowPlay = false;
    const soundscape = createSoundscape();

    await expect(soundscape.enable()).resolves.toBeUndefined();
    expect(soundscape.isEnabled()).toBe(false);

    FakeAudioElement.allowPlay = true;
    await soundscape.enable();
    expect(soundscape.isEnabled()).toBe(true);
    soundscape.stop();
  });
});

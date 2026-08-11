import { describe, expect, it, afterEach } from 'vitest';
import { createSoundscape } from '../src/audio/soundscape';

const originalAudioContext = (window as Window & { AudioContext?: typeof AudioContext }).AudioContext;

class FakeAudioParam {
  value = 0;

  cancelScheduledValues() {}

  setTargetAtTime() {}

  setValueAtTime() {}

  linearRampToValueAtTime() {}

  exponentialRampToValueAtTime() {}
}

class FakeAudioNode {
  connect() {}

  disconnect() {}

  start() {}

  stop() {}
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8_000;
  state: AudioContextState = 'suspended';
  destination = new FakeAudioNode();

  createGain() {
    return Object.assign(new FakeAudioNode(), { gain: new FakeAudioParam() });
  }

  createBiquadFilter() {
    return Object.assign(new FakeAudioNode(), {
      type: 'lowpass',
      frequency: new FakeAudioParam(),
    });
  }

  createBufferSource() {
    return Object.assign(new FakeAudioNode(), { buffer: null as AudioBuffer | null, loop: false });
  }

  createOscillator() {
    return Object.assign(new FakeAudioNode(), { frequency: new FakeAudioParam(), type: 'sine' });
  }

  createBuffer(_channels: number, frameCount: number, sampleRate: number) {
    return {
      getChannelData: () => new Float32Array(Math.max(1, Math.min(frameCount, sampleRate))),
    } as unknown as AudioBuffer;
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

class BlockedAudioContext extends FakeAudioContext {
  async resume() {
    throw new Error('autoplay blocked');
  }
}

afterEach(() => {
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: originalAudioContext,
  });
});

describe('soundscape', () => {
  it('stays safe when Web Audio is unavailable', async () => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    const soundscape = createSoundscape();

    await expect(soundscape.enable()).resolves.toBeUndefined();
    expect(soundscape.isEnabled()).toBe(false);
    expect(() => soundscape.cue('cry')).not.toThrow();
    soundscape.stop();
  });

  it('best-effort enables audio and supports a synthesized cry cue', async () => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
    const soundscape = createSoundscape();

    expect(soundscape.isEnabled()).toBe(false);
    await soundscape.enable();
    expect(soundscape.isEnabled()).toBe(true);
    expect(() => soundscape.cue('cry')).not.toThrow();
    expect('cueGiggle' in soundscape).toBe(false);

    soundscape.disable();
    expect(soundscape.isEnabled()).toBe(false);
    soundscape.stop();
  });

  it('resolves safely when autoplay is blocked so a later gesture can retry', async () => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: BlockedAudioContext });
    const soundscape = createSoundscape();

    await expect(soundscape.enable()).resolves.toBeUndefined();
    expect(soundscape.isEnabled()).toBe(false);
    expect(() => soundscape.cue('cry')).not.toThrow();
    soundscape.stop();
  });
});

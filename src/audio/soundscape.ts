import type { SoundCueKind } from '../narrative';

export type SoundscapeControls = {
  enable: () => Promise<void>;
  disable: () => void;
  pause: () => void;
  stop: () => void;
  cue: (kind: SoundCueKind) => void;
  isEnabled: () => boolean;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
}

function createNoiseBuffer(context: AudioContext, durationSeconds: number): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

export function createSoundscape(): SoundscapeControls {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let enabled = false;

  const ensureAudio = (): boolean => {
    if (context && masterGain) {
      return true;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      return false;
    }

    try {
      context = new AudioContextConstructor();
      masterGain = context.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(context.destination);
      return true;
    } catch {
      context = null;
      masterGain = null;
      return false;
    }
  };

  const enable = async () => {
    if (!ensureAudio() || !context || !masterGain) {
      return;
    }

    try {
      await context.resume();
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setTargetAtTime(0.9, context.currentTime, 0.2);
      enabled = true;
    } catch {
      enabled = false;
    }
  };

  const disable = () => {
    if (!context || !masterGain) {
      enabled = false;
      return;
    }

    masterGain.gain.cancelScheduledValues(context.currentTime);
    masterGain.gain.setTargetAtTime(0, context.currentTime, 0.18);
    enabled = false;
  };

  const pause = () => {
    if (context && context.state === 'running') {
      void context.suspend();
    }
  };

  const stop = () => {
    if (context) {
      void context.close().catch(() => undefined);
    }

    context = null;
    masterGain = null;
    enabled = false;
  };

  const createTone = (
    startAt: number,
    duration: number,
    startFrequency: number,
    endFrequency: number,
    peakGain: number,
    waveform: OscillatorType = 'sine',
  ) => {
    if (!context || !masterGain) {
      return;
    }

    const tone = context.createOscillator();
    const toneGain = context.createGain();

    tone.type = waveform;
    tone.frequency.setValueAtTime(startFrequency, startAt);
    tone.frequency.linearRampToValueAtTime(endFrequency, startAt + duration);
    toneGain.gain.setValueAtTime(0.0001, startAt);
    toneGain.gain.linearRampToValueAtTime(peakGain, startAt + Math.min(0.06, duration / 3));
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    tone.connect(toneGain);
    toneGain.connect(masterGain);
    tone.start(startAt);
    tone.stop(startAt + duration);
  };

  const cueNewbornCry = () => {
    if (!enabled || !context || !masterGain) {
      return;
    }

    const startAt = context.currentTime + 0.04;
    const pulses = [
      { offset: 0, duration: 0.62, start: 430, peak: 1_080 },
      { offset: 0.7, duration: 0.78, start: 500, peak: 1_180 },
    ];

    for (const pulse of pulses) {
      const pulseStart = startAt + pulse.offset;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();

      source.buffer = createNoiseBuffer(context, pulse.duration);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1_900, pulseStart);
      filter.frequency.linearRampToValueAtTime(1_050, pulseStart + pulse.duration);
      gain.gain.setValueAtTime(0.0001, pulseStart);
      gain.gain.linearRampToValueAtTime(0.28, pulseStart + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, pulseStart + pulse.duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(pulseStart);
      source.stop(pulseStart + pulse.duration);

      createTone(pulseStart, pulse.duration, pulse.start, pulse.peak, 0.3, 'triangle');
      createTone(pulseStart + 0.05, pulse.duration - 0.1, pulse.peak, 620, 0.1, 'sine');
    }
  };

  const cue = (kind: SoundCueKind) => {
    if (kind === 'cry') {
      cueNewbornCry();
    }
  };

  return {
    enable,
    disable,
    pause,
    stop,
    cue,
    isEnabled: () => enabled,
  };
}

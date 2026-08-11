import type { SoundCueKind } from '../narrative';

export type SoundscapeControls = {
  enable: () => Promise<void>;
  disable: () => void;
  pause: () => void;
  stop: () => void;
  cueFirstBreath: () => void;
  cueBabyCry: () => void;
  cueGiggle: () => void;
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
  let ambientSource: AudioBufferSourceNode | null = null;
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

  const startAmbient = () => {
    if (!context || !masterGain || ambientSource) {
      return;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, 2);
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    gain.gain.value = 0.024;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    ambientSource = source;
  };

  const enable = async () => {
    if (!ensureAudio() || !context || !masterGain) {
      return;
    }

    try {
      await context.resume();
      startAmbient();
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setTargetAtTime(0.9, context.currentTime, 0.45);
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
    if (ambientSource) {
      try {
        ambientSource.stop();
      } catch {
        // The source may already have stopped during teardown.
      }
      ambientSource.disconnect();
      ambientSource = null;
    }

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

  const cueFirstBreath = () => {
    if (!enabled || !context || !masterGain) {
      return;
    }

    const startAt = context.currentTime + 0.02;
    const duration = 0.72;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const tone = context.createOscillator();
    const toneGain = context.createGain();

    source.buffer = createNoiseBuffer(context, duration);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(440, startAt);
    filter.frequency.linearRampToValueAtTime(210, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.16, startAt + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    tone.type = 'sine';
    tone.frequency.setValueAtTime(240, startAt);
    tone.frequency.exponentialRampToValueAtTime(150, startAt + duration);
    toneGain.gain.setValueAtTime(0.0001, startAt);
    toneGain.gain.linearRampToValueAtTime(0.04, startAt + 0.1);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    tone.connect(toneGain);
    toneGain.connect(masterGain);

    source.start(startAt);
    source.stop(startAt + duration);
    tone.start(startAt);
    tone.stop(startAt + duration);
  };

  const cueBabyCry = () => {
    if (!enabled || !context || !masterGain) {
      return;
    }

    const startAt = context.currentTime + 0.03;
    const duration = 0.95;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = createNoiseBuffer(context, duration);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1_400, startAt);
    filter.frequency.linearRampToValueAtTime(900, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.13, startAt + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(startAt);
    source.stop(startAt + duration);

    createTone(startAt, duration, 620, 980, 0.22, 'triangle');
    createTone(startAt + 0.04, duration - 0.08, 920, 560, 0.08, 'sine');
  };

  const cueGiggle = () => {
    if (!enabled || !context || !masterGain) {
      return;
    }

    const startAt = context.currentTime + 0.03;
    const chirps = [
      { offset: 0, duration: 0.14, start: 780, end: 1_080 },
      { offset: 0.18, duration: 0.13, start: 860, end: 1_180 },
      { offset: 0.35, duration: 0.17, start: 720, end: 1_020 },
    ];

    for (const chirp of chirps) {
      createTone(startAt + chirp.offset, chirp.duration, chirp.start, chirp.end, 0.16, 'triangle');
    }
  };

  const cue = (kind: SoundCueKind) => {
    if (kind === 'cry') {
      cueBabyCry();
      return;
    }

    if (kind === 'giggle') {
      cueGiggle();
      return;
    }

    cueFirstBreath();
  };

  return {
    enable,
    disable,
    pause,
    stop,
    cueFirstBreath,
    cueBabyCry,
    cueGiggle,
    cue,
    isEnabled: () => enabled,
  };
}

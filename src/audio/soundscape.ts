export type SoundscapeControls = {
  enable: () => Promise<void>;
  disable: () => void;
  pause: () => void;
  stop: () => void;
  cueFirstBreath: () => void;
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
    gain.gain.value = 0.018;
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
      masterGain.gain.setTargetAtTime(0.75, context.currentTime, 0.8);
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
    gain.gain.linearRampToValueAtTime(0.12, startAt + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    tone.type = 'sine';
    tone.frequency.setValueAtTime(240, startAt);
    tone.frequency.exponentialRampToValueAtTime(150, startAt + duration);
    toneGain.gain.setValueAtTime(0.0001, startAt);
    toneGain.gain.linearRampToValueAtTime(0.025, startAt + 0.1);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    tone.connect(toneGain);
    toneGain.connect(masterGain);

    source.start(startAt);
    source.stop(startAt + duration);
    tone.start(startAt);
    tone.stop(startAt + duration);
  };

  return {
    enable,
    disable,
    pause,
    stop,
    cueFirstBreath,
    isEnabled: () => enabled,
  };
}

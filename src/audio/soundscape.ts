import type { SoundCueKind } from '../narrative';

export type SoundscapeControls = {
  enable: () => Promise<void>;
  disable: () => void;
  pause: () => void;
  stop: () => void;
  cue: (kind: SoundCueKind) => void;
  isEnabled: () => boolean;
};

const NEWBORN_AUDIO_FILES = [
  'audio/newborn-cry-01.mp3',
  'audio/newborn-cry-02.mp3',
  'audio/newborn-cry-03.mp3',
  'audio/newborn-cry-04.mp3',
  'audio/newborn-cry-05.mp3',
] as const;

const MICRO_PAUSE_MIN_MS = 140;
const MICRO_PAUSE_MAX_MS = 360;

function audioUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function createSoundscape(): SoundscapeControls {
  let player: HTMLAudioElement | null = null;
  let enabled = false;
  let stopped = false;
  let trackIndex = 0;
  let nextTrackTimer: number | undefined;

  const clearNextTrackTimer = () => {
    if (nextTrackTimer !== undefined) {
      window.clearTimeout(nextTrackTimer);
      nextTrackTimer = undefined;
    }
  };

  const setTrack = () => {
    if (!player) {
      return;
    }

    player.src = audioUrl(NEWBORN_AUDIO_FILES[trackIndex]);
    player.load();
  };

  const playCurrentTrack = async (): Promise<boolean> => {
    if (!player) {
      return false;
    }

    try {
      await player.play();
      return true;
    } catch {
      return false;
    }
  };

  const playNextTrack = () => {
    if (!enabled || stopped || !player) {
      return;
    }

    trackIndex = (trackIndex + 1) % NEWBORN_AUDIO_FILES.length;
    setTrack();
    void playCurrentTrack().then((played) => {
      if (!played) {
        enabled = false;
      }
    });
  };

  const scheduleNextTrack = () => {
    clearNextTrackTimer();
    if (!enabled || stopped) {
      return;
    }

    const pauseRange = MICRO_PAUSE_MAX_MS - MICRO_PAUSE_MIN_MS;
    const pause = MICRO_PAUSE_MIN_MS + Math.floor(Math.random() * (pauseRange + 1));
    nextTrackTimer = window.setTimeout(() => {
      nextTrackTimer = undefined;
      playNextTrack();
    }, pause);
  };

  const handleTrackEnded = () => {
    scheduleNextTrack();
  };

  const handleTrackError = () => {
    // Move past a missing/corrupt asset instead of leaving the experience
    // silent. The checked-in five files are expected to play normally.
    scheduleNextTrack();
  };

  const ensurePlayer = (): boolean => {
    if (player) {
      return true;
    }

    if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
      return false;
    }

    try {
      player = new window.Audio();
      player.preload = 'auto';
      player.volume = 0.48;
      player.addEventListener('ended', handleTrackEnded);
      player.addEventListener('error', handleTrackError);
      setTrack();
      return true;
    } catch {
      player = null;
      return false;
    }
  };

  const enable = async () => {
    stopped = false;
    if (!ensurePlayer() || !player) {
      enabled = false;
      return;
    }

    enabled = true;
    clearNextTrackTimer();
    if (player.ended) {
      trackIndex = (trackIndex + 1) % NEWBORN_AUDIO_FILES.length;
      setTrack();
    }
    const played = await playCurrentTrack();
    if (!played) {
      enabled = false;
    }
  };

  const disable = () => {
    enabled = false;
    clearNextTrackTimer();
    if (player) {
      player.pause();
      player.currentTime = 0;
    }
  };

  const pause = () => {
    clearNextTrackTimer();
    if (player && !player.paused) {
      player.pause();
    }
  };

  const stop = () => {
    stopped = true;
    enabled = false;
    clearNextTrackTimer();

    if (player) {
      player.pause();
      player.removeEventListener('ended', handleTrackEnded);
      player.removeEventListener('error', handleTrackError);
      player.removeAttribute('src');
      player.load();
      player = null;
    }
  };

  const cue = (_kind: SoundCueKind) => {
    // The five downloaded recordings form one continuous background. Story
    // beats no longer interrupt it with separate synthesized cues.
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

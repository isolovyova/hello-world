export type BirthSimulationOptions = {
  lambda: number;
  onBirth: () => void;
  isActive?: () => boolean;
  random?: () => number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
};

export type BirthSimulation = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

export function sampleNextDelaySeconds(
  lambda: number,
  random: () => number = Math.random,
): number {
  if (!Number.isFinite(lambda) || lambda <= 0) {
    throw new Error('lambda must be a positive finite number.');
  }

  const safeRandom = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, random()));
  return -Math.log(safeRandom) / lambda;
}

export function createBirthSimulation({
  lambda,
  onBirth,
  isActive = () => true,
  random = Math.random,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
}: BirthSimulationOptions): BirthSimulation {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let stopped = false;
  let firstEvent = true;

  const clearScheduledEvent = () => {
    if (timer !== null) {
      clearTimeoutFn(timer);
      timer = null;
    }
  };

  const scheduleNextEvent = () => {
    if (!running || stopped || !isActive()) {
      return;
    }

    const delaySeconds = sampleNextDelaySeconds(lambda, random);
    // A session should feel alive immediately. Only the first event receives a
    // warm-start cap; every subsequent event follows the Poisson process as sampled.
    const delayMilliseconds = firstEvent
      ? Math.min(delaySeconds * 1000, 900)
      : delaySeconds * 1000;
    firstEvent = false;

    timer = setTimeoutFn(() => {
      timer = null;
      if (!running || stopped || !isActive()) {
        return;
      }

      onBirth();
      scheduleNextEvent();
    }, Math.max(0, delayMilliseconds));
  };

  return {
    start() {
      if (running || stopped) {
        return;
      }
      running = true;
      scheduleNextEvent();
    },
    pause() {
      running = false;
      clearScheduledEvent();
    },
    resume() {
      if (stopped || running) {
        return;
      }
      running = true;
      scheduleNextEvent();
    },
    stop() {
      stopped = true;
      running = false;
      clearScheduledEvent();
    },
  };
}


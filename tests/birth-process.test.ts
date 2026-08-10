import { describe, expect, it } from 'vitest';
import { createBirthSimulation, sampleNextDelaySeconds } from '../src/simulation/birthProcess';

describe('birth timing', () => {
  it('samples the exponential delay for a known random value', () => {
    expect(sampleNextDelaySeconds(4, () => 0.5)).toBeCloseTo(Math.log(2) / 4);
  });

  it('uses one progressive timer at a time and supports lifecycle controls', () => {
    type TimerHandle = ReturnType<typeof setTimeout>;
    let handleId = 0;
    let scheduled: { callback: () => void; delay: number; handle: TimerHandle } | null = null;
    let clearedHandle: TimerHandle | null = null;
    let births = 0;

    const setTimeoutFn: typeof setTimeout = ((callback: (...args: unknown[]) => void, delay?: number) => {
      const handle = { id: ++handleId } as unknown as TimerHandle;
      scheduled = { callback: callback as () => void, delay: delay ?? 0, handle };
      return handle;
    }) as typeof setTimeout;
    const clearTimeoutFn: typeof clearTimeout = ((handle: TimerHandle) => {
      clearedHandle = handle;
    }) as typeof clearTimeout;

    const simulation = createBirthSimulation({
      lambda: 4.2,
      random: () => 0.5,
      onBirth: () => {
        births += 1;
      },
      setTimeoutFn,
      clearTimeoutFn,
    });

    simulation.start();
    expect(scheduled).not.toBeNull();
    expect(scheduled?.delay).toBeLessThanOrEqual(900);

    scheduled?.callback();
    expect(births).toBe(1);
    expect(scheduled).not.toBeNull();

    const activeHandle = scheduled?.handle ?? null;
    simulation.pause();
    expect(clearedHandle).toBe(activeHandle);

    simulation.resume();
    expect(scheduled).not.toBeNull();
    simulation.stop();
    expect(clearedHandle).toBe(scheduled?.handle ?? null);

    const birthsBeforeStoppedCallback = births;
    scheduled?.callback();
    expect(births).toBe(birthsBeforeStoppedCallback);
  });
});


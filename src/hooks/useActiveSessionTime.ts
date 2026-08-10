import { useEffect, useState } from 'react';

export function useActiveSessionTime(): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let previousTime = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - previousTime) / 1000;
      previousTime = now;

      if (document.visibilityState === 'visible') {
        setElapsedSeconds((elapsed) => elapsed + Math.max(0, deltaSeconds));
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  return elapsedSeconds;
}


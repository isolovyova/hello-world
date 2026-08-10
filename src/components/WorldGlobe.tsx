import { useEffect, useMemo, useRef } from 'react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { getAllCountryGeometries } from '../data/countryGeometries';
import type { BirthEvent } from '../types';

type WorldGlobeProps = {
  births: BirthEvent[];
  reducedMotion: boolean;
};

type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
};

type City = [longitude: number, latitude: number];

const FULL_ROTATION_MS = 120_000;
const POINT_LIFETIME_SECONDS = 5.5;
const STAR_COUNT = 34;

// These are decorative night-Earth lights. They are not birth data or a geographic claim.
const NIGHT_LIGHTS: readonly City[] = [
  [77.2, 28.6],
  [72.8, 19.1],
  [116.4, 39.9],
  [121.5, 31.2],
  [139.7, 35.7],
  [126.9, 37.6],
  [31.2, 30],
  [28.9, 41],
  [3.4, 6.5],
  [18.4, -33.9],
  [-74, 40.7],
  [-87.6, 41.9],
  [-118.2, 34.1],
  [-99.1, 19.4],
  [-46.6, -23.6],
  [-58.4, -34.6],
  [2.3, 48.9],
  [12.5, 41.9],
  [4.9, 52.4],
  [37.6, 55.8],
  [28, -26.2],
  [151.2, -33.9],
  [144.9, -37.8],
  [103.8, 1.4],
  [106.8, -6.2],
  [72.9, 19.1],
  [80.3, 13.1],
];

const STARS: readonly Star[] = [
  { x: 0.08, y: 0.18, size: 2.3, opacity: 0.54 },
  { x: 0.14, y: 0.72, size: 1.5, opacity: 0.42 },
  { x: 0.2, y: 0.1, size: 1.1, opacity: 0.55 },
  { x: 0.25, y: 0.84, size: 2.1, opacity: 0.4 },
  { x: 0.34, y: 0.17, size: 1.1, opacity: 0.5 },
  { x: 0.39, y: 0.9, size: 1.4, opacity: 0.36 },
  { x: 0.48, y: 0.12, size: 2.4, opacity: 0.5 },
  { x: 0.56, y: 0.78, size: 1.3, opacity: 0.4 },
  { x: 0.64, y: 0.19, size: 1.1, opacity: 0.52 },
  { x: 0.7, y: 0.9, size: 1.8, opacity: 0.4 },
  { x: 0.78, y: 0.11, size: 1.5, opacity: 0.5 },
  { x: 0.86, y: 0.7, size: 2.1, opacity: 0.42 },
  { x: 0.92, y: 0.24, size: 1.3, opacity: 0.48 },
  { x: 0.1, y: 0.48, size: 1.1, opacity: 0.32 },
  { x: 0.28, y: 0.3, size: 1.4, opacity: 0.34 },
  { x: 0.45, y: 0.33, size: 1, opacity: 0.3 },
  { x: 0.59, y: 0.47, size: 1.5, opacity: 0.35 },
  { x: 0.74, y: 0.36, size: 1.1, opacity: 0.33 },
  { x: 0.9, y: 0.52, size: 1.2, opacity: 0.32 },
  { x: 0.17, y: 0.92, size: 1, opacity: 0.26 },
  { x: 0.32, y: 0.06, size: 0.9, opacity: 0.35 },
  { x: 0.52, y: 0.92, size: 1, opacity: 0.3 },
  { x: 0.68, y: 0.07, size: 0.9, opacity: 0.36 },
  { x: 0.82, y: 0.83, size: 0.8, opacity: 0.3 },
  { x: 0.97, y: 0.84, size: 1.1, opacity: 0.3 },
  { x: 0.04, y: 0.9, size: 0.8, opacity: 0.28 },
  { x: 0.37, y: 0.63, size: 0.9, opacity: 0.32 },
  { x: 0.61, y: 0.28, size: 0.8, opacity: 0.3 },
  { x: 0.77, y: 0.58, size: 0.9, opacity: 0.3 },
  { x: 0.95, y: 0.44, size: 0.8, opacity: 0.28 },
  { x: 0.05, y: 0.35, size: 0.7, opacity: 0.26 },
  { x: 0.88, y: 0.94, size: 0.9, opacity: 0.25 },
  { x: 0.23, y: 0.57, size: 0.8, opacity: 0.27 },
  { x: 0.71, y: 0.75, size: 0.7, opacity: 0.25 },
];

function getViewport(element?: HTMLElement | null): Viewport {
  const rect = element?.getBoundingClientRect();
  const fallbackWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const fallbackHeight = typeof window === 'undefined' ? 460 : window.innerHeight * 0.66;

  return {
    width: Math.max(rect?.width ?? fallbackWidth, 320),
    height: Math.max(rect?.height ?? fallbackHeight, 280),
    dpr: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2),
  };
}

function getPointOpacity(ageSeconds: number, reducedMotion: boolean): number {
  const fadeIn = reducedMotion ? 0.1 : 0.25;
  const hold = reducedMotion ? 0.6 : 1.5;
  const fadeOut = reducedMotion ? 0.9 : 3.5;

  if (ageSeconds < 0 || ageSeconds > fadeIn + hold + fadeOut) {
    return 0;
  }
  if (ageSeconds < fadeIn) {
    return ageSeconds / fadeIn;
  }
  if (ageSeconds < fadeIn + hold) {
    return 1;
  }
  return Math.max(0, 1 - (ageSeconds - fadeIn - hold) / fadeOut);
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) {
  ctx.save();
  ctx.strokeStyle = `rgba(178, 222, 232, ${opacity})`;
  ctx.lineWidth = Math.max(0.55, size * 0.18);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - size * 2.1);
  ctx.lineTo(x, y + size * 2.1);
  ctx.moveTo(x - size * 1.4, y);
  ctx.lineTo(x + size * 1.4, y);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const background = ctx.createRadialGradient(width * 0.5, height * 0.32, 0, width * 0.5, height * 0.38, Math.max(width, height));
  background.addColorStop(0, '#071a2b');
  background.addColorStop(0.34, '#041323');
  background.addColorStop(1, '#020711');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  for (const [index, star] of STARS.entries()) {
    const twinkle = 0.84 + Math.sin(time * (0.35 + (index % 4) * 0.08) + index) * 0.16;
    const x = star.x * width;
    const y = star.y * height;
    if (star.size > 1.6) {
      drawCross(ctx, x, y, star.size, star.opacity * twinkle);
    } else {
      ctx.fillStyle = `rgba(223, 240, 255, ${star.opacity * twinkle})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawOrbits(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((-17 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(141, 223, 225, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.2, radius * 0.31, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((23 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(226, 180, 88, 0.22)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 12]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.16, radius * 0.24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCityLights(
  ctx: CanvasRenderingContext2D,
  projection: ReturnType<typeof geoOrthographic>,
  center: [number, number],
  centerX: number,
  centerY: number,
  radius: number,
  time: number,
) {
  for (const [index, [longitude, latitude]] of NIGHT_LIGHTS.entries()) {
    const projected = projection([longitude, latitude]);
    if (!projected || geoDistance([longitude, latitude], center) > Math.PI / 2) {
      continue;
    }

    const dx = (projected[0] - centerX) / radius;
    const dy = (projected[1] - centerY) / radius;
    const depth = 1 - Math.min(1, Math.hypot(dx, dy));
    const night = Math.min(1, Math.max(0, dx * 0.7 + dy * 0.7 + 0.55));
    const twinkle = 0.78 + 0.22 * Math.sin(time * 1.2 + index);
    const opacity = depth * (0.16 + 0.66 * night) * twinkle;
    if (opacity <= 0.02) {
      continue;
    }

    const glow = ctx.createRadialGradient(projected[0], projected[1], 0, projected[0], projected[1], 5.5);
    glow.addColorStop(0, `rgba(255, 232, 170, ${opacity})`);
    glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(projected[0], projected[1], 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function WorldGlobe({ births, reducedMotion }: WorldGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birthsRef = useRef(births);
  const reducedMotionRef = useRef(reducedMotion);
  const countries = useMemo(() => getAllCountryGeometries(), []);

  useEffect(() => {
    birthsRef.current = births;
  }, [births]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    const viewport: Viewport = { width: 0, height: 0, dpr: 1 };
    let rotationStartedAt = performance.now();
    let rotation = 0;
    let frame = 0;

    const resize = () => {
      const next = getViewport(container);
      viewport.width = next.width;
      viewport.height = next.height;
      viewport.dpr = next.dpr;
      canvas.width = Math.round(next.width * next.dpr);
      canvas.height = Math.round(next.height * next.dpr);
      canvas.style.width = `${next.width}px`;
      canvas.style.height = `${next.height}px`;
      context.setTransform(next.dpr, 0, 0, next.dpr, 0, 0);
      rotationStartedAt = performance.now() - (rotation / 360) * FULL_ROTATION_MS;
    };

    const draw = (timestamp: number) => {
      const time = timestamp / 1000;
      if (!reducedMotionRef.current) {
        rotation = (((timestamp - rotationStartedAt) / FULL_ROTATION_MS) * 360) % 360;
      }

      const { width, height } = viewport;
      if (!width || !height) {
        resize();
        frame = window.requestAnimationFrame(draw);
        return;
      }

      context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      drawBackground(context, width, height, time);

      const centerX = width / 2;
      const narrowViewport = width < 720;
      const centerY = height * (narrowViewport ? 0.37 : 0.42);
      const radius = Math.min(width * (narrowViewport ? 0.48 : 0.365), height * (narrowViewport ? 0.45 : 0.5));
      drawOrbits(context, centerX, centerY, radius);

      const projection = geoOrthographic()
        .translate([centerX, centerY])
        .scale(radius)
        .clipAngle(90)
        .rotate([rotation, -14, 0]);
      const path = geoPath(projection, context);
      const center = projection.invert?.([centerX, centerY]);

      const atmosphere = context.createRadialGradient(centerX, centerY, radius * 0.92, centerX, centerY, radius * 1.5);
      atmosphere.addColorStop(0, 'rgba(96, 196, 225, 0.22)');
      atmosphere.addColorStop(0.35, 'rgba(60, 150, 190, 0.08)');
      atmosphere.addColorStop(1, 'rgba(60, 150, 190, 0)');
      context.fillStyle = atmosphere;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      context.fill();

      const ocean = context.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.42,
        radius * 0.05,
        centerX,
        centerY,
        radius * 1.12,
      );
      ocean.addColorStop(0, '#17536a');
      ocean.addColorStop(0.55, '#092f43');
      ocean.addColorStop(1, '#020d1b');
      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = ocean;
      context.fill();

      context.save();
      context.beginPath();
      path({ type: 'Sphere' });
      context.clip();

      context.beginPath();
      path(geoGraticule10());
      context.strokeStyle = 'rgba(170, 225, 245, 0.06)';
      context.lineWidth = 0.6;
      context.stroke();

      context.beginPath();
      for (const country of countries) {
        path(country);
      }
      context.fillStyle = '#0b2435';
      context.fill();
      context.strokeStyle = 'rgba(89, 161, 184, 0.26)';
      context.lineWidth = 0.55;
      context.stroke();

      if (center) {
        drawCityLights(context, projection, center, centerX, centerY, radius, time);
      }

      const shading = context.createRadialGradient(
        centerX - radius * 0.42,
        centerY - radius * 0.46,
        radius * 0.05,
        centerX,
        centerY,
        radius * 1.12,
      );
      shading.addColorStop(0, 'rgba(150, 225, 245, 0.22)');
      shading.addColorStop(0.32, 'rgba(30, 110, 140, 0.02)');
      shading.addColorStop(0.62, 'rgba(3, 8, 18, 0.44)');
      shading.addColorStop(1, 'rgba(1, 3, 8, 0.92)');
      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = shading;
      context.fill();

      const now = performance.now();
      for (let index = birthsRef.current.length - 1; index >= 0; index -= 1) {
        const birth = birthsRef.current[index];
        const ageSeconds = (now - birth.timestamp) / 1000;
        if (ageSeconds > POINT_LIFETIME_SECONDS) {
          continue;
        }

        const projected = projection([birth.lng, birth.lat]);
        const isVisible = projected && center && geoDistance([birth.lng, birth.lat], center) <= Math.PI / 2;
        const opacity = getPointOpacity(ageSeconds, reducedMotionRef.current);
        if (!projected || !isVisible || opacity <= 0) {
          continue;
        }

        const pulse = reducedMotionRef.current ? 1 : 1 + Math.sin(ageSeconds * 3.5) * 0.12;
        const radiusForPing = 2 + ageSeconds * 8;
        context.strokeStyle = `rgba(255, 226, 164, ${opacity * 0.7})`;
        context.lineWidth = 1.1;
        context.beginPath();
        context.arc(projected[0], projected[1], radiusForPing, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = `rgba(255, 240, 200, ${opacity * 0.9})`;
        context.beginPath();
        context.arc(projected[0], projected[1], 1.7 * pulse, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      const rim = context.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      rim.addColorStop(0, 'rgba(190, 240, 255, 0.55)');
      rim.addColorStop(0.45, 'rgba(120, 200, 230, 0.14)');
      rim.addColorStop(1, 'rgba(120, 200, 230, 0)');
      context.strokeStyle = rim;
      context.lineWidth = 1.25;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(container);
    window.addEventListener('resize', resize);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [countries]);

  return (
    <div className="world-globe" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="world-globe__canvas"
        role="img"
        aria-label="A slowly turning illustrated blue Earth with soft simulated birth lights"
      />
    </div>
  );
}

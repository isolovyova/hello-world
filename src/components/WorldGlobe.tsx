import { useEffect, useMemo, useRef } from 'react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { getAllCountryGeometries, getCountryBorders } from '../data/countryGeometries';
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
  radius: number;
  opacity: number;
  speed: number;
  phase: number;
};

type City = [longitude: number, latitude: number];

/** Degrees of rotation per millisecond — a full turn takes a little over three minutes. */
const ROTATION_DEGREES_PER_MS = 0.0017;
const MAX_FRAME_DELTA_MS = 100;
const POINT_LIFETIME_SECONDS = 2.6;
/** One star per this many square pixels of viewport. */
const STAR_AREA_PER_STAR = 5200;

// These are decorative night-Earth lights. They are not birth data or a geographic claim.
const NIGHT_LIGHTS: readonly City[] = [
  [139.7, 35.7], [121.5, 31.2], [77.2, 28.6], [72.9, 19.1], [31.2, 30.0], [90.4, 23.8],
  [116.4, 39.9], [-99.1, 19.4], [-46.6, -23.5], [67.0, 24.9], [3.4, 6.5], [55.3, 25.2],
  [37.6, 55.8], [-58.4, -34.6], [2.35, 48.9], [-0.13, 51.5], [-74.0, 40.7], [-118.2, 34.1],
  [-87.6, 41.9], [-43.2, -22.9], [126.98, 37.57], [106.8, -6.2], [100.5, 13.75], [13.4, 52.5],
  [12.5, 41.9], [28.98, 41.0], [35.2, 31.8], [44.4, 33.3], [51.4, 35.7], [18.4, -33.9],
  [36.8, -1.3], [7.5, 9.06], [-3.7, 40.4], [151.2, -33.9], [174.8, -36.9], [103.8, 1.35],
  [114.2, 22.3], [120.98, 14.6], [-79.4, 43.7], [-123.1, 49.3], [-70.7, -33.5], [-77.05, -12.05],
  [-84.4, 33.75], [-95.4, 29.8], [30.5, 50.45], [24.9, 60.2], [10.75, 59.9], [105.85, 21.03],
  [113.3, 23.1], [78.5, 17.4], [80.3, 13.1], [88.4, 22.6], [74.3, 31.5], [68.4, 25.4],
  [38.7, 9.0], [32.6, 0.3], [13.2, -8.8], [-15.6, 11.9], [-8.0, 12.6], [47.5, -18.9],
  [46.7, 24.7],
];

function getViewport(element?: HTMLElement | null): Viewport {
  const rect = element?.getBoundingClientRect();
  const fallbackWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const fallbackHeight = typeof window === 'undefined' ? 460 : window.innerHeight;

  return {
    width: Math.max(rect?.width ?? fallbackWidth, 320),
    height: Math.max(rect?.height ?? fallbackHeight, 280),
    dpr: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2),
  };
}

function makeStars(width: number, height: number): Star[] {
  const count = Math.round((width * height) / STAR_AREA_PER_STAR);
  const stars: Star[] = [];

  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      // Squaring the random keeps most stars small and a few noticeably brighter.
      radius: Math.random() * Math.random() * 1.5 + 0.25,
      opacity: 0.18 + Math.random() * 0.65,
      speed: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    });
  }

  return stars;
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: readonly Star[],
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
) {
  ctx.fillStyle = '#dff0ff';
  for (const star of stars) {
    const twinkle = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(time * star.speed + star.phase);
    ctx.globalAlpha = Math.max(0, star.opacity * twinkle);
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCityLights(
  ctx: CanvasRenderingContext2D,
  projection: ReturnType<typeof geoOrthographic>,
  center: [number, number],
  centerX: number,
  centerY: number,
  radius: number,
  time: number,
  reducedMotion: boolean,
) {
  for (const [index, [longitude, latitude]] of NIGHT_LIGHTS.entries()) {
    const projected = projection([longitude, latitude]);
    if (!projected || geoDistance([longitude, latitude], center) > Math.PI / 2) {
      continue;
    }

    const dx = (projected[0] - centerX) / radius;
    const dy = (projected[1] - centerY) / radius;
    // Fade towards the limb, and brighten on the night side (lower-right).
    const depth = 1 - Math.min(1, Math.hypot(dx, dy));
    const night = Math.min(1, Math.max(0, dx * 0.7 + dy * 0.7 + 0.55));
    const twinkle = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(time * 1.4 + index);
    const opacity = depth * 0.9 * (0.25 + 0.75 * night) * twinkle;
    if (opacity <= 0.02) {
      continue;
    }

    ctx.globalAlpha = opacity;
    const glow = ctx.createRadialGradient(projected[0], projected[1], 0, projected[0], projected[1], 3.6);
    glow.addColorStop(0, 'rgba(255, 232, 170, 0.95)');
    glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(projected[0], projected[1], 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function WorldGlobe({ births, reducedMotion }: WorldGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birthsRef = useRef(births);
  const reducedMotionRef = useRef(reducedMotion);
  const countries = useMemo(() => getAllCountryGeometries(), []);
  const borders = useMemo(() => getCountryBorders(), []);

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
    const graticule = geoGraticule10();
    let stars: Star[] = [];
    let background: CanvasGradient | null = null;
    let centerX = 0;
    let centerY = 0;
    let radius = 0;
    let rotation = -20;
    let previousTimestamp: number | null = null;
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

      centerX = next.width / 2;
      centerY = next.height * 0.42;
      radius = Math.min(next.width * 0.34, next.height * 0.42);

      background = context.createRadialGradient(
        centerX,
        centerY * 0.9,
        0,
        centerX,
        centerY,
        Math.max(next.width, next.height) * 0.95,
      );
      background.addColorStop(0, '#0a1a2a');
      background.addColorStop(0.35, '#061020');
      background.addColorStop(1, '#04060d');

      stars = makeStars(next.width, next.height);
    };

    const draw = (timestamp: number) => {
      const { width, height } = viewport;
      if (!width || !height || !background) {
        resize();
        frame = window.requestAnimationFrame(draw);
        return;
      }

      const time = timestamp / 1000;
      const delta = previousTimestamp === null ? 16 : Math.min(timestamp - previousTimestamp, MAX_FRAME_DELTA_MS);
      previousTimestamp = timestamp;
      const motionless = reducedMotionRef.current;
      if (!motionless) {
        rotation = (rotation + ROTATION_DEGREES_PER_MS * delta) % 360;
      }

      context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      drawStars(context, stars, width, height, time, motionless);

      const projection = geoOrthographic()
        .translate([centerX, centerY])
        .scale(radius)
        .clipAngle(90)
        .rotate([rotation, -14, 0]);
      const path = geoPath(projection, context);
      const center = projection.invert?.([centerX, centerY]);

      const atmosphere = context.createRadialGradient(centerX, centerY, radius * 0.94, centerX, centerY, radius * 1.5);
      atmosphere.addColorStop(0, 'rgba(96, 196, 225, 0.2)');
      atmosphere.addColorStop(0.35, 'rgba(60, 150, 190, 0.07)');
      atmosphere.addColorStop(1, 'rgba(60, 150, 190, 0)');
      context.fillStyle = atmosphere;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      context.fill();

      const ocean = context.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.4,
        radius * 0.1,
        centerX,
        centerY,
        radius * 1.15,
      );
      ocean.addColorStop(0, '#12495e');
      ocean.addColorStop(0.55, '#0b2c3d');
      ocean.addColorStop(1, '#061722');
      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = ocean;
      context.fill();

      context.save();
      context.beginPath();
      path({ type: 'Sphere' });
      context.clip();

      context.beginPath();
      path(graticule);
      context.strokeStyle = 'rgba(170, 225, 245, 0.05)';
      context.lineWidth = 0.6;
      context.stroke();

      context.beginPath();
      for (const country of countries) {
        path(country);
      }
      context.fillStyle = '#0d2230';
      context.fill();
      context.strokeStyle = 'rgba(140, 215, 240, 0.16)';
      context.lineWidth = 0.5;
      context.stroke();

      context.beginPath();
      path(borders);
      context.strokeStyle = 'rgba(150, 210, 235, 0.09)';
      context.lineWidth = 0.4;
      context.stroke();

      if (center) {
        drawCityLights(context, projection, center, centerX, centerY, radius, time, motionless);
      }

      // Limb darkening and terminator, lit from the upper left.
      const shading = context.createRadialGradient(
        centerX - radius * 0.42,
        centerY - radius * 0.46,
        radius * 0.05,
        centerX,
        centerY,
        radius * 1.12,
      );
      shading.addColorStop(0, 'rgba(150, 225, 245, 0.3)');
      shading.addColorStop(0.32, 'rgba(30, 110, 140, 0.05)');
      shading.addColorStop(0.62, 'rgba(3, 8, 18, 0.42)');
      shading.addColorStop(1, 'rgba(1, 3, 8, 0.94)');
      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = shading;
      context.fill();

      // Arrivals sit above the shading so they read as light rather than surface.
      const now = performance.now();
      for (let index = birthsRef.current.length - 1; index >= 0; index -= 1) {
        const birth = birthsRef.current[index];
        const age = (now - birth.timestamp) / 1000 / POINT_LIFETIME_SECONDS;
        if (age < 0 || age > 1) {
          continue;
        }

        const projected = projection([birth.lng, birth.lat]);
        const onNearSide = projected && center && geoDistance([birth.lng, birth.lat], center) <= Math.PI / 2;
        if (!projected || !onNearSide) {
          continue;
        }

        const opacity = (1 - age) * (1 - age);
        const ringRadius = motionless ? 6 : 2 + age * 16;
        context.strokeStyle = `rgba(255, 226, 164, ${opacity * 0.7})`;
        context.lineWidth = 1.1;
        context.beginPath();
        context.arc(projected[0], projected[1], ringRadius, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = `rgba(255, 240, 200, ${opacity * 0.9})`;
        context.beginPath();
        context.arc(projected[0], projected[1], 1.7, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      const rim = context.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      rim.addColorStop(0, 'rgba(190, 240, 255, 0.55)');
      rim.addColorStop(0.45, 'rgba(120, 200, 230, 0.12)');
      rim.addColorStop(1, 'rgba(120, 200, 230, 0)');
      context.strokeStyle = rim;
      context.lineWidth = 1.3;
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
  }, [borders, countries]);

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

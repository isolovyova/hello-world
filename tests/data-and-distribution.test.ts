import { geoContains } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import birthDataset from '../src/data/births-2026.json';
import { getCountryGeometry } from '../src/data/countryGeometries';
import { sampleNextDelaySeconds } from '../src/simulation/birthProcess';
import { randomPointInCountry } from '../src/simulation/randomPointInCountry';
import { createWeightedCountries, selectCountry } from '../src/simulation/weightedCountry';
import type { BirthDataset } from '../src/types';

const dataset = birthDataset as BirthDataset;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('prepared dataset', () => {
  it('has internally consistent UN-derived totals and normalized weights', () => {
    const totalBirths = dataset.countries.reduce((sum, country) => sum + country.annualBirths, 0);
    const totalWeight = dataset.countries.reduce((sum, country) => sum + country.weight, 0);

    expect(dataset.indicator).toMatchObject({ id: 57, name: 'Total births by sex', variantId: 4 });
    expect(dataset.year).toBe(2026);
    expect(dataset.countries.length).toBeGreaterThan(200);
    expect(dataset.worldBirths).toBe(totalBirths);
    expect(totalWeight).toBeCloseTo(1, 10);
    expect(dataset.lambdaGlobal).toBeCloseTo(dataset.worldBirths / 31_536_000, 12);
    expect(dataset.countries.every((country) => country.annualBirths > 0)).toBe(true);
  });
});

describe('country selection validation', () => {
  it('converges toward UN-derived country weights over 100,000 events', () => {
    const countries = createWeightedCountries(dataset.countries);
    const random = seededRandom(42);
    const sampleSize = 100_000;
    const counts = new Map<string, number>();

    for (let index = 0; index < sampleSize; index += 1) {
      const country = selectCountry(countries, random);
      counts.set(country.iso3, (counts.get(country.iso3) ?? 0) + 1);
    }

    for (const country of countries.slice(0, 5)) {
      const observed = (counts.get(country.iso3) ?? 0) / sampleSize;
      expect(Math.abs(observed - country.weight)).toBeLessThan(0.006);
    }
  });
});

describe('birth rate validation', () => {
  it('converges toward the expected mean inter-arrival time over 100,000 samples', () => {
    const random = seededRandom(99);
    const sampleSize = 100_000;
    let totalDelay = 0;

    for (let index = 0; index < sampleSize; index += 1) {
      totalDelay += sampleNextDelaySeconds(dataset.lambdaGlobal, random);
    }

    const observedMeanDelay = totalDelay / sampleSize;
    const expectedMeanDelay = 1 / dataset.lambdaGlobal;
    expect(Math.abs(observedMeanDelay - expectedMeanDelay)).toBeLessThan(0.01);
  });
});

describe('geographic placement validation', () => {
  it('places samples inside large and island/multi-island country geometries', () => {
    const samples = [356, 840, 360, 608];
    const random = seededRandom(7);

    for (const m49 of samples) {
      const country = dataset.countries.find((item) => item.m49 === m49);
      const geometry = getCountryGeometry(m49);
      expect(country).toBeDefined();
      expect(geometry).toBeDefined();

      for (let index = 0; index < 8; index += 1) {
        const point = randomPointInCountry(country!, random);
        expect(geoContains(geometry!, [point.lng, point.lat])).toBe(true);
      }
    }
  });
});

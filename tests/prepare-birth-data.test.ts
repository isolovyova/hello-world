import { describe, expect, it } from 'vitest';
import { prepareBirthDataset, type RawBirthRow, type RawLocation } from '../scripts/prepare-birth-data';

describe('prepareBirthDataset', () => {
  it('keeps the requested UN slice and derives totals and weights', () => {
    const rows: RawBirthRow[] = [
      { locationId: 1, indicatorId: 57, variantId: 4, timeLabel: '2026', sexId: 3, value: 40.4 },
      { locationId: 2, indicatorId: 57, variantId: 4, timeLabel: '2026', sexId: 3, value: 59.6 },
      { locationId: 1, indicatorId: 57, variantId: 1, timeLabel: '2026', sexId: 3, value: 999 },
      { locationId: 1, indicatorId: 57, variantId: 4, timeLabel: '2025', sexId: 3, value: 999 },
      { locationId: 1, indicatorId: 57, variantId: 4, timeLabel: '2026', sexId: 1, value: 999 },
    ];
    const locations: RawLocation[] = [
      { id: 1, name: 'Alpha', iso3: 'ALP', locationTypeId: 4, geo: { lat: 10, long: 20 } },
      { id: 2, name: 'Beta', iso3: 'BET', locationTypeId: 4, geo: { lat: null, long: null } },
      { id: 3, name: 'Not a country', iso3: 'NAC', locationTypeId: 1 },
    ];

    const dataset = prepareBirthDataset(rows, locations);

    expect(dataset.indicator).toMatchObject({ id: 57, variantId: 4, sex: 'Both sexes' });
    expect(dataset.year).toBe(2026);
    expect(dataset.worldBirths).toBe(100);
    expect(dataset.lambdaGlobal).toBe(100 / 31_536_000);
    expect(dataset.countries.map(({ iso3 }) => iso3)).toEqual(['BET', 'ALP']);
    expect(dataset.countries.map(({ weight }) => weight)).toEqual([0.6, 0.4]);
    expect(dataset.countries[1]).toMatchObject({ latitude: 10, longitude: 20 });
    expect(dataset.countries[0]).toMatchObject({ latitude: null, longitude: null });
  });

  it('fails clearly when the requested source slice is absent', () => {
    expect(() => prepareBirthDataset([], [])).toThrow(/no matching 2026 Median/);
  });
});


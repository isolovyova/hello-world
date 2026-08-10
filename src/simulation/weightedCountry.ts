import type { CountryBirthData } from '../types';

export type WeightedCountry = CountryBirthData & { cumulativeWeight: number };

export function createWeightedCountries(countries: CountryBirthData[]): WeightedCountry[] {
  const totalWeight = countries.reduce((sum, country) => sum + country.weight, 0);
  if (countries.length === 0 || totalWeight <= 0) {
    throw new Error('At least one country with a positive birth weight is required.');
  }

  let cumulativeWeight = 0;
  return countries.map((country) => {
    cumulativeWeight += country.weight / totalWeight;
    return { ...country, cumulativeWeight };
  });
}

export function selectCountry(
  countries: WeightedCountry[],
  random: () => number = Math.random,
): WeightedCountry {
  if (countries.length === 0) {
    throw new Error('Cannot select a country from an empty list.');
  }

  const target = Math.min(Math.max(random(), 0), 1);
  let low = 0;
  let high = countries.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (target <= countries[middle].cumulativeWeight) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return countries[low];
}


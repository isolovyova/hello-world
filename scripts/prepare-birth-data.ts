import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type RawBirthRow = {
  locationId: number;
  indicatorId: number;
  variantId: number;
  timeLabel: string;
  sexId: number;
  value: number;
};

export type RawLocation = {
  id: number;
  name: string;
  iso3: string;
  locationTypeId: number;
  geo?: { lat: number | null; long: number | null };
};

export type PreparedCountry = {
  m49: number;
  iso3: string;
  name: string;
  annualBirths: number;
  weight: number;
  latitude: number | null;
  longitude: number | null;
};

export type PreparedBirthDataset = {
  source: string;
  sourceUrl: string;
  indicator: {
    id: number;
    shortName: string;
    name: string;
    sex: string;
    variant: string;
    variantId: number;
  };
  year: number;
  variant: string;
  worldBirths: number;
  secondsInYear: number;
  lambdaGlobal: number;
  countries: PreparedCountry[];
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIRTH_SOURCE = resolve(ROOT, 'data/source/wpp2024-tbirths-2026.json');
const LOCATION_SOURCE = resolve(ROOT, 'data/source/wpp2024-locations.json');
const OUTPUT = resolve(ROOT, 'src/data/births-2026.json');

export function prepareBirthDataset(
  birthRows: RawBirthRow[],
  locations: RawLocation[],
): PreparedBirthDataset {
  const locationById = new Map(
    locations
      .filter((location) => location.locationTypeId === 4)
      .map((location) => [location.id, location]),
  );

  const rows = birthRows.filter(
    (row) =>
      row.indicatorId === 57 &&
      row.variantId === 4 &&
      row.timeLabel === '2026' &&
      row.sexId === 3,
  );

  if (rows.length === 0) {
    throw new Error('The downloaded UN source contains no matching 2026 Median / Both sexes rows.');
  }

  const countries = rows.map((row) => {
    const location = locationById.get(row.locationId);
    if (!location) {
      throw new Error(`Missing country metadata for UN M49 location ${row.locationId}.`);
    }

    const latitude = location.geo?.lat ?? null;
    const longitude = location.geo?.long ?? null;

    return {
      m49: location.id,
      iso3: location.iso3,
      name: location.name,
      annualBirths: Math.round(row.value),
      weight: 0,
      latitude,
      longitude,
    } satisfies PreparedCountry;
  });

  const worldBirths = countries.reduce((sum, country) => sum + country.annualBirths, 0);
  if (worldBirths <= 0) {
    throw new Error('The downloaded UN source produced a non-positive world birth total.');
  }

  for (const country of countries) {
    country.weight = country.annualBirths / worldBirths;
  }

  const secondsInYear = 365 * 24 * 60 * 60;

  return {
    source: 'United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects: The 2024 Revision, custom data acquired via website.',
    sourceUrl: 'https://population.un.org/wpp/',
    indicator: {
      id: 57,
      shortName: 'TBirths',
      name: 'Total births by sex',
      sex: 'Both sexes',
      variant: 'Median',
      variantId: 4,
    },
    year: 2026,
    variant: 'Median',
    worldBirths,
    secondsInYear,
    lambdaGlobal: worldBirths / secondsInYear,
    countries: countries.sort((a, b) => b.annualBirths - a.annualBirths),
  };
}

export async function main(): Promise<void> {
  const [birthSource, locationSource] = await Promise.all([
    readFile(BIRTH_SOURCE, 'utf8'),
    readFile(LOCATION_SOURCE, 'utf8'),
  ]);

  const dataset = prepareBirthDataset(
    JSON.parse(birthSource) as RawBirthRow[],
    JSON.parse(locationSource) as RawLocation[],
  );

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log(
    `Prepared ${dataset.countries.length} countries and ${dataset.worldBirths.toLocaleString()} projected births for ${dataset.year}.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-110m.json';

type CountryFeature = Feature<Geometry, Record<string, unknown>> & {
  id?: string | number;
};

const countryCollection = feature(
  worldAtlas as never,
  worldAtlas.objects.countries as never,
) as unknown as FeatureCollection<Geometry, Record<string, unknown>>;

const byId = new Map<string, CountryFeature>();

for (const country of countryCollection.features as CountryFeature[]) {
  if (country.id == null) {
    continue;
  }

  const id = String(country.id);
  byId.set(id, country);
  byId.set(id.padStart(3, '0'), country);
  byId.set(String(Number(id)), country);
}

export function getCountryGeometry(m49: number): CountryFeature | undefined {
  return byId.get(String(m49)) ?? byId.get(String(m49).padStart(3, '0'));
}

export function getAllCountryGeometries(): CountryFeature[] {
  return [...new Set(byId.values())];
}

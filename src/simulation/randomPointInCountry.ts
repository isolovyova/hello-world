import { geoBounds, geoCentroid, geoContains } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import { getCountryGeometry } from '../data/countryGeometries';
import type { CountryBirthData } from '../types';

export type Coordinates = { lat: number; lng: number };
type CountryFeature = Feature<Geometry, Record<string, unknown>>;

export function randomPointInCountry(
  country: CountryBirthData,
  random: () => number = Math.random,
): Coordinates {
  const countryFeature = getCountryGeometry(country.m49) as CountryFeature | undefined;

  if (!countryFeature) {
    return {
      lat: country.latitude ?? 0,
      lng: country.longitude ?? 0,
    };
  }

  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(countryFeature);
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const point: [number, number] = [
      minLng + random() * (maxLng - minLng),
      minLat + random() * (maxLat - minLat),
    ];

    if (geoContains(countryFeature, point)) {
      return { lat: point[1], lng: point[0] };
    }
  }

  const [centroidLng, centroidLat] = geoCentroid(countryFeature);
  return { lat: centroidLat, lng: centroidLng };
}


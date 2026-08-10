export type CountryBirthData = {
  m49: number;
  iso3: string;
  name: string;
  annualBirths: number;
  weight: number;
  latitude: number | null;
  longitude: number | null;
};

export type BirthDataset = {
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
  countries: CountryBirthData[];
};

export type BirthEvent = {
  id: string;
  timestamp: number;
  iso3: string;
  m49: number;
  lat: number;
  lng: number;
};

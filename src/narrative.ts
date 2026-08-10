import type { BirthDataset, CountryBirthData } from './types';

export type StoryHeadline = string | ((liveCount: number) => string);

export type StoryBeat = {
  id: string;
  eyebrow: string;
  headline: StoryHeadline;
  body: string;
  durationSeconds: number;
  soundCue?: boolean;
};

export type StoryBeatState = {
  beat: StoryBeat;
  beatIndex: number;
  cycleIndex: number;
  instanceKey: string;
};

type StoryDataset = Pick<BirthDataset, 'countries' | 'secondsInYear'>;

const STORY_BEAT_DURATION_SECONDS = 15;
const COUNTRY_FACT_ISO3 = ['IND', 'NGA', 'CHN', 'IDN'] as const;

function getCountry(countries: CountryBirthData[], iso3: string): CountryBirthData | undefined {
  return countries.find((country) => country.iso3 === iso3);
}

function formatExpectedBirthsPerMinute(country: CountryBirthData | undefined, secondsInYear: number): string {
  if (!country) {
    return 'a few';
  }

  const expectedBirthsPerMinute = (country.annualBirths / secondsInYear) * 60;
  if (expectedBirthsPerMinute < 1) {
    return 'less than 1';
  }

  return Math.round(expectedBirthsPerMinute).toLocaleString('en-US');
}

function countryFact(
  dataset: StoryDataset,
  iso3: (typeof COUNTRY_FACT_ISO3)[number],
  soundCue = false,
): StoryBeat {
  const country = getCountry(dataset.countries, iso3);
  const countryName = country?.name ?? iso3;
  const expectedBirths = formatExpectedBirthsPerMinute(country, dataset.secondsInYear);

  return {
    id: `country-${iso3.toLowerCase()}`,
    eyebrow: 'From the UN projection',
    headline: `In ${countryName}, an average minute holds about ${expectedBirths} expected births.`,
    body:
      iso3 === 'IND'
        ? 'Not a live report. A quiet measure of how many lives are beginning.'
        : iso3 === 'NGA'
          ? 'Many beginnings, happening at once.'
          : iso3 === 'CHN'
            ? 'The numbers are distant. The lives are not.'
            : 'The world keeps becoming.',
    durationSeconds: STORY_BEAT_DURATION_SECONDS,
    soundCue,
  };
}

export function createStoryBeats(dataset: StoryDataset): StoryBeat[] {
  return [
    {
      id: 'one-minute-on-earth',
      eyebrow: 'One minute on Earth',
      headline: (liveCount) =>
        `While you were here, ${liveCount.toLocaleString()} ${liveCount === 1 ? 'life began.' : 'lives began.'}`,
      body: "You don't know their names. You will probably never meet them. But you're sharing the world now.",
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
      soundCue: true,
    },
    {
      id: 'somewhere-right-now',
      eyebrow: 'Somewhere, right now',
      headline: 'A first breath.',
      body: 'A whole person is arriving in the same world as you.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
    {
      id: 'one-small-planet',
      eyebrow: 'One small planet',
      headline: 'We are here together.',
      body: 'Different rooms. Different languages. One shared sky.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
    countryFact(dataset, 'IND', true),
    {
      id: 'world-keeps-turning',
      eyebrow: 'The world keeps turning',
      headline: 'Life keeps making room.',
      body: 'Even while everything else is asking for your attention.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
    countryFact(dataset, 'NGA'),
    {
      id: 'stay-present',
      eyebrow: 'Stay present',
      headline: 'You are here. They are here.',
      body: 'For a moment, nothing else needs to be solved.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
    countryFact(dataset, 'CHN', true),
    {
      id: 'gentle-reminder',
      eyebrow: 'A gentle reminder',
      headline: 'The world is more than the news.',
      body: 'Joy can be quiet and still be real.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
      soundCue: true,
    },
    countryFact(dataset, 'IDN'),
    {
      id: 'a-little-longer',
      eyebrow: 'A little longer',
      headline: 'Someone is meeting the world for the first time.',
      body: 'Stay with that thought.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
    {
      id: 'keep-looking',
      eyebrow: 'Keep looking',
      headline: 'There is more life arriving than we can name.',
      body: 'You do not have to know every story for it to matter.',
      durationSeconds: STORY_BEAT_DURATION_SECONDS,
    },
  ];
}

export function getStoryBeat(elapsedSeconds: number, dataset: StoryDataset): StoryBeatState {
  const beats = createStoryBeats(dataset);
  const safeElapsedSeconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const cycleDurationSeconds = beats.reduce((total, beat) => total + beat.durationSeconds, 0);
  const cycleIndex = Math.floor(safeElapsedSeconds / cycleDurationSeconds);
  const cycleElapsedSeconds = safeElapsedSeconds % cycleDurationSeconds;

  let elapsedWithinBeat = 0;
  let beatIndex = beats.length - 1;

  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (cycleElapsedSeconds < elapsedWithinBeat + beat.durationSeconds) {
      beatIndex = index;
      break;
    }
    elapsedWithinBeat += beat.durationSeconds;
  }

  const beat = beats[beatIndex];
  return {
    beat,
    beatIndex,
    cycleIndex,
    instanceKey: `${cycleIndex}:${beat.id}`,
  };
}

export function getStoryHeadline(beat: StoryBeat, liveCount: number): string {
  return typeof beat.headline === 'function' ? beat.headline(liveCount) : beat.headline;
}


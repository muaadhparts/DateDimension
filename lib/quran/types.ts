export type SurahSummary = {
  number: number;
  /** The Arabic name as the source writes it, e.g. سُورَةُ ٱلْفَاتِحَةِ. */
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  verses: number;
};

export type Verse = {
  number: number;
  text: string;
  /** Page in the standard Madani mushaf. */
  page: number;
  juz: number;
  sajda: boolean;
};

export type Surah = Omit<SurahSummary, 'verses'> & {
  /** Whether the Basmala is printed above the surah rather than as a verse. */
  basmala: boolean;
  verses: Verse[];
};

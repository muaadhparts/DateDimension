/**
 * Fetches the Quran once into data/quran/, so the site serves it from disk and
 * never depends on a third party at request time.
 *
 * Text: the Uthmani script from Tanzil (tanzil.net), served here through the
 * AlQuran Cloud API. Tanzil's terms require the text to be reproduced without
 * modification and with attribution, which is why nothing below rewrites it
 * and why every Quran page credits the source.
 *
 * Run with: node scripts/fetch-quran.mjs
 */
import {mkdir, writeFile} from 'node:fs/promises';

const SOURCE = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const OUT = new URL('../data/quran/', import.meta.url);
const JSON_NEWLINE = String.fromCharCode(10);

const response = await fetch(SOURCE, {signal: AbortSignal.timeout(120_000)});
if (!response.ok) throw new Error(`the source answered ${response.status}`);
const body = await response.json();
if (body.code !== 200 || !body.data?.surahs) throw new Error('unexpected payload');

await mkdir(OUT, {recursive: true});

/** The Basmala, exactly as the source writes it. */
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * The source prefixes the Basmala to the first verse of every surah except
 * Al-Fatiha, where it is verse 1 in its own right, and At-Tawbah, which has
 * none. Every mushaf prints it as its own line above the surah, so it is
 * separated here rather than reproduced inside a verse. The text itself is
 * untouched; only the leading BOM the source emits is dropped.
 */
function separateBasmala(number, verses) {
  const clean = verses.map((verse) => ({...verse, text: verse.text.replace(/^﻿/, '').trim()}));
  // Al-Fatiha opens with it as verse 1; At-Tawbah has none at all.
  if (number === 1 || number === 9) return {basmala: false, verses: clean};

  const first = clean[0];
  if (first && first.text.startsWith(BASMALA)) {
    clean[0] = {...first, text: first.text.slice(BASMALA.length).trim()};
    return {basmala: true, verses: clean};
  }
  return {basmala: false, verses: clean};
}

const index = [];
for (const surah of body.data.surahs) {
  index.push({
    number: surah.number,
    name: surah.name,
    englishName: surah.englishName,
    englishNameTranslation: surah.englishNameTranslation,
    revelationType: surah.revelationType,
    verses: surah.ayahs.length,
  });

  const {basmala, verses} = separateBasmala(
    surah.number,
    surah.ayahs.map((ayah) => ({
      number: ayah.numberInSurah,
      text: ayah.text,
      page: ayah.page,
      juz: ayah.juz,
      sajda: Boolean(ayah.sajda),
    })),
  );

  await writeFile(
    new URL(`${surah.number}.json`, OUT),
    JSON.stringify({
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      revelationType: surah.revelationType,
      basmala,
      verses,
    }) + JSON_NEWLINE,
  );
}

await writeFile(new URL('index.json', OUT), JSON.stringify(index, null, 2) + '\n');
console.log(`wrote ${index.length} surahs`);

/**
 * Rebuilds data/quran/pages/ from the surah files: one file per mushaf page,
 * carrying exactly the verses printed on that page of the Madani print.
 *
 * The page number of every verse comes from the source data, so a page here
 * holds what the same page holds in a physical copy — including the places
 * where a page spans the end of one surah and the start of the next.
 *
 * Run with: node scripts/build-mushaf-pages.mjs
 */
import {mkdir, readFile, writeFile} from 'node:fs/promises';

const DATA = new URL('../data/quran/', import.meta.url);
const OUT = new URL('pages/', DATA);
const NEWLINE = String.fromCharCode(10);

await mkdir(OUT, {recursive: true});

const pages = new Map();

for (let number = 1; number <= 114; number++) {
  const surah = JSON.parse(await readFile(new URL(`${number}.json`, DATA), 'utf8'));
  for (const verse of surah.verses) {
    if (!pages.has(verse.page)) pages.set(verse.page, []);
    const page = pages.get(verse.page);
    let block = page[page.length - 1];
    if (!block || block.surah !== surah.number) {
      block = {
        surah: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        // The Basmala is printed once, above the surah's first verse.
        basmala: surah.basmala && verse.number === 1,
        juz: verse.juz,
        verses: [],
      };
      page.push(block);
    }
    block.verses.push({number: verse.number, text: verse.text, sajda: verse.sajda});
  }
}

const index = [];
for (const [pageNumber, blocks] of [...pages.entries()].sort((a, b) => a[0] - b[0])) {
  // A page can straddle two juz; the running head names the one it opens in.
  const juz = blocks[0].juz;
  index.push({page: pageNumber, juz, surahs: blocks.map((block) => block.surah)});
  await writeFile(
    new URL(`${pageNumber}.json`, OUT),
    JSON.stringify({page: pageNumber, blocks, juz}) + NEWLINE,
  );
}

await writeFile(new URL('index.json', OUT), JSON.stringify(index) + NEWLINE);
console.log(`wrote ${index.length} mushaf pages`);

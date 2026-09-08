import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SURAHS,
  TOTAL_VERSES,
  SEARCHABLE,
  MUSHAF_PAGES,
  surahSummary,
  loadSurah,
  loadMushafPage,
} from '../../lib/quran/index.ts';
import {BASMALA, bareName, foldArabic} from '../../lib/quran/text.ts';

test('The index is the whole Quran, in order', () => {
  assert.equal(SURAHS.length, 114);
  assert.equal(TOTAL_VERSES, 6236, 'the received count of verses');
  SURAHS.forEach((surah, position) => {
    assert.equal(surah.number, position + 1, 'mushaf order');
    assert.ok(surah.verses > 0);
    assert.ok(surah.name.length > 0);
    assert.ok(['Meccan', 'Medinan'].includes(surah.revelationType));
  });
  assert.equal(SURAHS[1].verses, 286, 'Al-Baqarah');
  assert.equal(SURAHS[107].verses, 3, 'Al-Kawthar');
});

test('Each surah carries exactly the verses the index promises', async () => {
  for (const number of [1, 2, 9, 18, 55, 112, 114]) {
    const surah = await loadSurah(number);
    assert.ok(surah, `surah ${number} loads`);
    assert.equal(surah.number, number);
    assert.equal(surah.verses.length, surahSummary(number).verses, `surah ${number} verse count`);
    surah.verses.forEach((verse, position) => {
      assert.equal(verse.number, position + 1, 'verses are numbered in order');
      assert.ok(verse.text.trim().length > 0, 'no empty verse');
      assert.ok(verse.page >= 1 && verse.page <= 604, 'a real mushaf page');
      assert.ok(verse.juz >= 1 && verse.juz <= 30);
    });
  }
});

test('The Basmala is placed the way a mushaf places it', async () => {
  const fatiha = await loadSurah(1);
  assert.equal(fatiha.basmala, false, 'Al-Fatiha counts it as verse 1');
  // The shipped constant must be the source's own text, character for
  // character — a dropped shadda would be a modification of the text.
  assert.equal(fatiha.verses[0].text, BASMALA);
  const basmala = BASMALA;

  const tawbah = await loadSurah(9);
  assert.equal(tawbah.basmala, false, 'At-Tawbah has none');
  assert.ok(!tawbah.verses[0].text.startsWith(basmala));

  for (const number of [2, 18, 112, 114]) {
    const surah = await loadSurah(number);
    assert.equal(surah.basmala, true, `surah ${number} prints it above`);
    assert.ok(!surah.verses[0].text.startsWith(basmala), 'and not inside verse 1');
  }
});

test('Out-of-range surah numbers resolve to nothing', async () => {
  for (const number of [0, 115, -1, 1.5, Number.NaN]) {
    assert.equal(await loadSurah(number), null, `${number} is not a surah`);
  }
});

test('Search folds diacritics, hamza forms and script', () => {
  const find = (query) => {
    const folded = foldArabic(query);
    const latin = query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return SEARCHABLE.filter(
      (surah) =>
        (folded && surah.search.includes(folded)) || (latin && surah.search.includes(latin)),
    );
  };

  for (const query of ['الكهف', 'كهف', 'الكَهْف', 'kahf', 'Al-Kahf', '18']) {
    const matches = find(query);
    assert.ok(
      matches.some((surah) => surah.number === 18),
      `"${query}" finds Al-Kahf`,
    );
  }

  assert.ok(
    find('الفاتحه').some((s) => s.number === 1),
    'ة folded to ه',
  );
  assert.ok(
    find('الاخلاص').some((s) => s.number === 112),
    'إ folded to ا',
  );
  assert.equal(find('zzzz').length, 0, 'nonsense finds nothing');
});

test('Names drop the leading word "سورة"', () => {
  assert.equal(bareName({name: 'سُورَةُ ٱلْفَاتِحَةِ'}), 'ٱلْفَاتِحَةِ');
  assert.equal(bareName({name: 'النَّاسِ'}), 'النَّاسِ', 'a name without it is untouched');
});

test('The 604 pages hold the whole Quran, each verse once and in order', async () => {
  // The page files are a second copy of the text, so the thing worth proving
  // is that they say exactly what the surah files say — no verse lost at a
  // page break, none printed twice, none out of order.
  const seen = [];
  for (let page = 1; page <= MUSHAF_PAGES; page++) {
    const sheet = await loadMushafPage(page);
    assert.ok(sheet, `page ${page} loads`);
    assert.equal(sheet.page, page);
    assert.ok(sheet.blocks.length > 0, `page ${page} is not blank`);
    assert.ok(sheet.juz >= 1 && sheet.juz <= 30, `page ${page} names a juz`);
    for (const block of sheet.blocks) {
      assert.ok(block.verses.length > 0);
      for (const verse of block.verses) {
        assert.ok(verse.text.trim().length > 0, `page ${page} has no empty verse`);
        seen.push(`${block.surah}:${verse.number}`);
      }
    }
  }
  assert.equal(seen.length, TOTAL_VERSES, 'every verse printed once');
  assert.equal(new Set(seen).size, TOTAL_VERSES, 'and none printed twice');

  const expected = [];
  for (let number = 1; number <= 114; number++) {
    const surah = await loadSurah(number);
    for (const verse of surah.verses) expected.push(`${number}:${verse.number}`);
  }
  assert.deepEqual(seen, expected, 'in the order the mushaf prints them');
});

test('A page begins a surah only where the surah begins', async () => {
  const first = await loadMushafPage(1);
  assert.deepEqual(
    first.blocks.map((block) => block.surah),
    [1],
  );
  assert.equal(first.blocks[0].verses.length, 7, 'Al-Fatiha in full on page 1');
  assert.equal(first.blocks[0].basmala, false, 'its Basmala is verse 1');

  const second = await loadMushafPage(2);
  assert.deepEqual(
    second.blocks.map((block) => block.surah),
    [2],
  );
  assert.equal(second.blocks[0].basmala, true, 'Al-Baqarah opens with it');
  assert.equal(second.blocks[0].verses[0].number, 1);

  const last = await loadMushafPage(MUSHAF_PAGES);
  assert.deepEqual(
    last.blocks.map((block) => block.surah),
    [112, 113, 114],
    'three surahs share the last page',
  );
  assert.ok(
    last.blocks.every((block) => block.basmala),
    'each of them starts there, so each is headed',
  );

  // A page that continues a surah must not repeat its heading.
  const middle = await loadMushafPage(3);
  assert.equal(middle.blocks[0].surah, 2);
  assert.equal(middle.blocks[0].basmala, false);
  assert.notEqual(middle.blocks[0].verses[0].number, 1);
});

test('Out-of-range mushaf pages resolve to nothing', async () => {
  for (const page of [0, 605, -1, 2.5, Number.NaN]) {
    assert.equal(await loadMushafPage(page), null, `${page} is not a page`);
  }
});

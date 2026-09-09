import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getArtwork, artworkUrl, ARTWORK_REVISION} from '../../lib/quran/artwork.ts';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-53 -198 345 550"><path d="M0 0"/></svg>';
test('artwork validates page boundaries before making a request', async () => {
  const never = () => { throw new Error('Unexpected fetch'); };
  for (const page of ['000.svg', '605.svg', '../001.svg', '2.svg', '001.png']) {
    await assert.rejects(getArtwork(page, never), RangeError);
  }
  assert.match(artworkUrl(604), /604\.svg\?v=/);
});
test('artwork pins its source, preserves the original viewBox and coalesces requests', async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    assert.ok(url.includes(ARTWORK_REVISION));
    assert.ok(url.endsWith('/001.svg'));
    assert.equal(options.redirect, 'error');
    return new Response(svg);
  };
  const pages = await Promise.all([getArtwork('001.svg', fetcher), getArtwork('001.svg', fetcher)]);
  assert.deepEqual(pages, [svg, svg]);
  assert.equal(calls, 1);
  assert.equal(await getArtwork('001.svg', fetcher), svg);
  assert.equal(calls, 1);
});
test('failed upstream requests can be retried and are never cached as pages', async () => {
  await assert.rejects(getArtwork('002.svg', async () => new Response('unavailable', {status: 503})));
  assert.equal(await getArtwork('002.svg', async () => new Response(svg)), svg);
});
test('invalid, oversized and active SVG content is rejected', async () => {
  for (const body of ['<html>error</html>', svg.replace('</svg>', '<script>alert(1)</script></svg>'), 'x'.repeat(2_000_001)]) {
    await assert.rejects(getArtwork('003.svg', async () => new Response(body)));
  }
});

# Mushaf artwork

The reader uses the original Hafs / King Fahd Complex vector pages, distributed
by [Quranpedia](https://github.com/quranpedia/quran-svg), pinned to revision
`b91d39e1065b57bdda3e94aca8ecf3575e50e1e6`.

Artwork belongs to the King Fahd Glorious Quran Printing Complex. Quranpedia's
[NOTICE](https://github.com/quranpedia/quran-svg/blob/b91d39e1065b57bdda3e94aca8ecf3575e50e1e6/NOTICE.md)
documents the artwork terms separately from its CC0 metadata. The attribution
appears on the sources page. The reader has no external link beneath its image.

- `/api/mushaf/001.svg` through `/api/mushaf/604.svg` fetch only the pinned files
  on `raw.githubusercontent.com`. Forge needs outbound HTTPS to that host.
- No SVG content is inserted into HTML. The reader uses an image, preserving
  each original viewBox, including the different origins of the opening pages.
- Fetches have a 12-second timeout and 2 MB size limit. The process cache is
  bounded to 8 MB of text; at most six upstream requests run concurrently.
  Repeated requests for the same page share a request. Failed responses are not
  cached and return 503 with `no-store`.
- Successful images have a one-day browser cache and seven-day shared cache.
  This is separate from the HTML/RSC cache. The pinned revision is part of the
  image URL. No scripture data files or prayer calculations were changed.
- A full printed page may contain a neighbouring surah. The expandable text
  on a surah route contains only that surah's verses. It remains available when
  an image cannot load and retains the unmodified local Tanzil text.
- Fit mode scales a page as one image. Enlarge mode scrolls inside the reader;
  it never changes the word order or printed line breaks. Browser zoom remains
  available. Text mode can reflow for accessible reading and copying.

Before deploying, run the existing CI gates and check `/ar/mushaf/1`,
`/ar/mushaf/3`, `/ar/mushaf/604`, `/en/quran/2`, and image retry on the target
server. Check narrow widths, fit/enlarge controls, page turns, language changes,
and browser back/forward. Review the source and all gates before changing the
pinned artwork revision.

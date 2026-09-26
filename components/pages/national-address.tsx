'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Copy, Crosshair, ExternalLink, MapPin, RotateCcw, Search, Wand2} from 'lucide-react';
import type {Lang} from '@/lib/i18n';
import {
  FIELD_KEYS,
  cleanFields,
  fieldsProblem,
  normaliseShortCode,
  type AddressFields,
  type NationalAddress,
} from '@/lib/national-address/core';

type Label = readonly [string, string];
type Source = 'code' | 'fields' | 'map';
type Message = {source: Source; kind: 'ok' | 'warn' | 'error'; text: string} | null;

const FIELD_LABELS: Record<keyof AddressFields, Label> = {
  building: ['رقم المبنى', 'Building number'],
  street: ['الشارع', 'Street'],
  additional: ['الرقم الإضافي', 'Additional number'],
  district: ['الحي', 'District'],
  city: ['المدينة', 'City'],
  postalCode: ['الرمز البريدي', 'Postal code'],
};
const NUMERIC: Partial<Record<keyof AddressFields, number>> = {
  building: 4,
  additional: 4,
  postalCode: 5,
};
const SAMPLE: Record<keyof AddressFields, Label> = {
  building: ['4294', '4294'],
  street: ['طريق الملك فهد', 'King Fahd Road'],
  additional: ['6309', '6309'],
  district: ['المنتزه', 'Al Muntazah'],
  city: ['بريدة', 'Buraydah'],
  postalCode: ['52381', '52381'],
};
const EMPTY: AddressFields = {
  building: '',
  street: '',
  additional: '',
  district: '',
  city: '',
  postalCode: '',
};

// Saudi Arabia as a whole, until there is an address to show.
const KSA = {lat: 23.9, lng: 45.1};

type LatLngLiteral = {lat: number; lng: number};
type LatLng = {lat(): number; lng(): number};
type MapsEvent = {latLng?: LatLng | null};
type GMap = {
  panTo(p: LatLngLiteral): void;
  setZoom(z: number): void;
  getZoom(): number | undefined;
  addListener(event: string, handler: (e: MapsEvent) => void): void;
};
type GMarker = {
  setPosition(p: LatLngLiteral): void;
  setMap(m: GMap | null): void;
  getPosition(): LatLng | null | undefined;
  addListener(event: string, handler: () => void): void;
};
type MapsApi = {importLibrary(name: string): Promise<Record<string, unknown>>};
type MapCtor = new (el: HTMLElement, options: Record<string, unknown>) => GMap;
type MarkerCtor = new (options: Record<string, unknown>) => GMarker;

declare global {
  interface Window {
    google?: {maps?: MapsApi};
    __nationalAddressMap?: () => void;
  }
}

let loading: Promise<MapsApi> | null = null;
/** One script tag for the whole visit, however often the page mounts. */
function loadMaps(url: string): Promise<MapsApi> {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  loading ??= new Promise<MapsApi>((resolve, reject) => {
    window.__nationalAddressMap = () => resolve(window.google!.maps!);
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Maps failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export default function NationalAddressPage({lang}: {lang: Lang}) {
  const ar = lang === 'ar';
  const t = useCallback((label: Label) => label[ar ? 0 : 1], [ar]);

  const [code, setCode] = useState('');
  const [fields, setFields] = useState<AddressFields>(EMPTY);
  const [address, setAddress] = useState<NationalAddress | null>(null);
  const [busy, setBusy] = useState<Source | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [copied, setCopied] = useState('');
  const [mapState, setMapState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markerRef = useRef<GMarker | null>(null);
  const markerCtor = useRef<MarkerCtor | null>(null);
  // Where the pin belongs, remembered for when the map finishes loading.
  const pinRef = useRef<LatLngLiteral | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  // The map's listeners are attached once; this keeps them on the latest handler.
  const resolvePointRef = useRef<(point: LatLngLiteral) => Promise<void>>(async () => {});

  const placePin = useCallback((point: LatLngLiteral, focus: boolean) => {
    pinRef.current = point;
    const map = mapRef.current;
    if (!map || !markerCtor.current) return;
    if (!markerRef.current) {
      const marker = new markerCtor.current({position: point, map, draggable: true});
      marker.addListener('dragend', () => {
        const at = marker.getPosition();
        if (at) void resolvePointRef.current({lat: at.lat(), lng: at.lng()});
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(point);
    }
    if (focus) {
      map.panTo(point);
      if ((map.getZoom() ?? 0) < 17) map.setZoom(18);
    }
  }, []);

  const apply = useCallback(
    (found: NationalAddress, focus = true) => {
      setAddress(found);
      setFields(Object.fromEntries(FIELD_KEYS.map((k) => [k, found[k]])) as AddressFields);
      setCode(found.shortCode ?? '');
      setCopied('');
      if (found.lat !== null && found.lon !== null) {
        placePin({lat: found.lat, lng: found.lon}, focus);
      }
      if (found.shortCode) {
        const url = new URL(window.location.href);
        url.searchParams.set('code', found.shortCode);
        window.history.replaceState(window.history.state, '', url);
      }
    },
    [placePin],
  );

  const errorText = useCallback(
    (source: Source, status: number, body: {error?: string; field?: string}) => {
      if (status === 429)
        return t(['طلبات كثيرة متتالية. انتظر دقيقة ثم حاول.', 'Too many lookups. Wait a minute.']);
      if (body.error === 'invalid_code')
        return t([
          'العنوان المختصر أربعة أحرف إنجليزية ثم أربعة أرقام، مثل QBWA4294.',
          'A short address is four letters then four digits, like QBWA4294.',
        ]);
      if (body.error === 'incomplete_fields') {
        if (body.field === 'building')
          return t(['اكتب رقم المبنى، وهو أربعة أرقام.', 'Enter the building number (4 digits).']);
        if (body.field === 'street')
          return t([
            'اكتب اسم الشارع؛ بدونه لا يمكن تحديد المبنى.',
            'Enter the street name; the building cannot be found without it.',
          ]);
        return t(['اكتب المدينة أو الرمز البريدي.', 'Enter the city or the postal code.']);
      }
      if (status === 404) {
        if (source === 'code')
          return t([
            'لم يُعثر على عنوان بهذا الرمز. تأكد من الأحرف والأرقام.',
            'No address has this code. Check the letters and digits.',
          ]);
        if (source === 'fields')
          return t([
            'لم نجد مبنى مطابقًا. راجع رقم المبنى واسم الشارع، أو حدد المبنى على الخريطة.',
            'No matching building. Check the building number and street, or pick it on the map.',
          ]);
        return t([
          'لا يوجد عنوان عند هذه النقطة. قرّب الخريطة واضغط على المبنى نفسه.',
          'No address at this point. Zoom in and tap the building itself.',
        ]);
      }
      return t([
        'الخدمة غير متاحة الآن. حاول بعد قليل.',
        'The lookup is unavailable right now. Try again shortly.',
      ]);
    },
    [t],
  );

  const request = useCallback(
    async (source: Source, params: Record<string, string>) => {
      setBusy(source);
      setMessage(null);
      try {
        const response = await fetch(
          '/api/national-address?' + new URLSearchParams({...params, lang}),
          {headers: {accept: 'application/json'}},
        );
        const body = (await response.json().catch(() => ({}))) as {
          data?: NationalAddress;
          mismatches?: (keyof AddressFields)[];
          error?: string;
          field?: string;
        };
        if (!response.ok || !body.data) {
          setMessage({source, kind: 'error', text: errorText(source, response.status, body)});
          return null;
        }
        return body;
      } catch {
        setMessage({
          source,
          kind: 'error',
          text: t(['تعذر الاتصال. تحقق من الإنترنت.', 'Could not connect. Check your connection.']),
        });
        return null;
      } finally {
        setBusy(null);
      }
    },
    [lang, errorText, t],
  );

  const showResult = () =>
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'}),
    );

  async function decode(value = code) {
    const normal = normaliseShortCode(value);
    if (!normal) {
      setMessage({
        source: 'code',
        kind: 'error',
        text: errorText('code', 400, {error: 'invalid_code'}),
      });
      return;
    }
    setCode(normal);
    const body = await request('code', {code: normal});
    if (!body?.data) return;
    apply(body.data);
    setMessage({
      source: 'code',
      kind: 'ok',
      text: t(['تم فك العنوان المختصر.', 'Short address decoded.']),
    });
  }

  async function encode() {
    const clean = cleanFields(fields);
    const problem = fieldsProblem(clean);
    if (problem) {
      setMessage({
        source: 'fields',
        kind: 'error',
        text: errorText('fields', 400, {error: 'incomplete_fields', field: problem}),
      });
      document.getElementById(`naddr-${problem}`)?.focus();
      return;
    }
    const body = await request('fields', clean);
    if (!body?.data) return;
    apply(body.data);
    const differ = body.mismatches ?? [];
    setMessage(
      differ.length
        ? {
            source: 'fields',
            kind: 'warn',
            text:
              t([
                'وُجد العنوان، لكن هذه البيانات تختلف عمّا كتبته وصُحّحت حسب المسجّل: ',
                'Found, but these differed from what you typed and were corrected to the record: ',
              ]) +
              differ
                .map((k) => `${t(FIELD_LABELS[k])} (${clean[k]} ← ${body.data![k]})`)
                .join(ar ? '، ' : ', '),
          }
        : body.data.shortCode
          ? {
              source: 'fields',
              kind: 'ok',
              text: t(['تم توليد العنوان المختصر.', 'Short address generated.']),
            }
          : {
              source: 'fields',
              kind: 'warn',
              text: t([
                'وُجد الموقع لكن بلا عنوان مختصر. حدد المبنى على الخريطة.',
                'Found the place but no short address. Pick the building on the map.',
              ]),
            },
    );
    showResult();
  }

  const resolvePoint = useCallback(
    async (point: LatLngLiteral) => {
      placePin(point, false);
      const body = await request('map', {lat: point.lat.toFixed(6), lon: point.lng.toFixed(6)});
      if (!body?.data) return;
      // The pin moves onto the building that was found, so it shows which one.
      apply(body.data, false);
      setMessage(
        body.data.shortCode
          ? {
              source: 'map',
              kind: 'ok',
              text: t(['تم استخراج العنوان من الخريطة.', 'Address taken from the map.']),
            }
          : {
              source: 'map',
              kind: 'warn',
              text: t([
                'لا يحمل هذا الموقع عنوانًا مختصرًا. قرّب الخريطة واضغط على المبنى نفسه.',
                'This spot has no short address. Zoom in and tap the building itself.',
              ]),
            },
      );
      showResult();
    },
    [apply, placePin, request, t],
  );
  useEffect(() => {
    resolvePointRef.current = resolvePoint;
  }, [resolvePoint]);

  // A shared link — ?code=QBWA4294 — opens already decoded.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('code');
    if (!shared || !normaliseShortCode(shared)) return;
    const timer = setTimeout(() => void decode(shared));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The map is billed per load, so it loads only once it is about to be seen.
  useEffect(() => {
    const el = mapEl.current;
    if (!el || mapState !== 'idle') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setMapState('loading');
        void (async () => {
          try {
            const config = await fetch(`/api/national-address/map?lang=${lang}`);
            const body = (await config.json()) as {data?: {loaderUrl: string}};
            if (!body.data) throw new Error('No map configuration');
            const maps = await loadMaps(body.data.loaderUrl);
            const {Map} = (await maps.importLibrary('maps')) as {Map: MapCtor};
            const {Marker} = (await maps.importLibrary('marker')) as {Marker: MarkerCtor};
            const start = pinRef.current;
            const map = new Map(el, {
              center: start ?? KSA,
              zoom: start ? 18 : 5,
              mapTypeControl: true,
              streetViewControl: false,
              clickableIcons: false,
              gestureHandling: 'cooperative',
            });
            map.addListener('click', (e) => {
              if (e.latLng)
                void resolvePointRef.current({lat: e.latLng.lat(), lng: e.latLng.lng()});
            });
            mapRef.current = map;
            markerCtor.current = Marker;
            if (start) placePin(start, true);
            setMapState('ready');
          } catch {
            setMapState('failed');
          }
        })();
      },
      {rootMargin: '200px'},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lang, mapState, placePin]);

  function locate() {
    if (!navigator.geolocation) {
      setMessage({
        source: 'map',
        kind: 'error',
        text: t(['متصفحك لا يدعم تحديد الموقع.', 'Your browser cannot share its location.']),
      });
      return;
    }
    setBusy('map');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {lat: position.coords.latitude, lng: position.coords.longitude};
        placePin(point, true);
        void resolvePoint(point);
      },
      () => {
        setBusy(null);
        setMessage({
          source: 'map',
          kind: 'error',
          text: t([
            'تعذر تحديد موقعك. اسمح للمتصفح بالوصول إلى الموقع، أو اضغط على الخريطة.',
            'Could not get your location. Allow location access, or tap the map.',
          ]),
        });
      },
      {enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000},
    );
  }

  function reset() {
    setCode('');
    setFields(EMPTY);
    setAddress(null);
    setMessage(null);
    setCopied('');
    markerRef.current?.setMap(null);
    markerRef.current = null;
    pinRef.current = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState(window.history.state, '', url);
  }

  const fullText = (a: NationalAddress) =>
    [
      a.shortCode ? `${t(['العنوان المختصر', 'Short address'])}: ${a.shortCode}` : '',
      ...FIELD_KEYS.map((k) => (a[k] ? `${t(FIELD_LABELS[k])}: ${a[k]}` : '')),
      a.region ? `${t(['المنطقة', 'Region'])}: ${a.region}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied('failed');
    }
  }

  const note = (source: Source) =>
    message?.source === source ? (
      <p
        className={`naddr-note is-${message.kind}`}
        role={message.kind === 'error' ? 'alert' : 'status'}
      >
        {message.text}
      </p>
    ) : null;

  return (
    <div className="naddr">
      <section className="panel naddr-code" aria-labelledby="naddr-code-title">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void decode();
          }}
        >
          <h2 id="naddr-code-title">{t(['فك العنوان المختصر', 'Decode a short address'])}</h2>
          <label className="sub" htmlFor="naddr-code">
            {t([
              'أربعة أحرف ثم أربعة أرقام، كما في شهادة العنوان الوطني أو لوحة المبنى.',
              'Four letters then four digits, as on the national address certificate or the building plate.',
            ])}
          </label>
          <div className="naddr-code-row">
            <input
              id="naddr-code"
              dir="ltr"
              value={code}
              maxLength={10}
              placeholder="QBWA4294"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-invalid={message?.source === 'code' && message.kind === 'error'}
            />
            <button className="btn" type="submit" disabled={busy !== null}>
              <Search size={18} />
              {busy === 'code' ? t(['جارٍ البحث…', 'Looking up…']) : t(['فك العنوان', 'Decode'])}
            </button>
          </div>
          {note('code')}
        </form>
      </section>

      {address && (
        <section
          className="panel naddr-result"
          ref={resultRef}
          aria-label={t(['النتيجة', 'Result'])}
        >
          <div className="naddr-result-top">
            <div>
              <span className="sub">{t(['العنوان المختصر', 'Short address'])}</span>
              <strong className="naddr-short" dir="ltr">
                {address.shortCode ?? '—'}
              </strong>
            </div>
            <div className="naddr-result-actions">
              {address.shortCode && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void copy(address.shortCode!, 'code')}
                >
                  <Copy size={16} />
                  {copied === 'code' ? t(['تم النسخ', 'Copied']) : t(['نسخ الرمز', 'Copy code'])}
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                onClick={() => void copy(fullText(address), 'all')}
              >
                <Copy size={16} />
                {copied === 'all'
                  ? t(['تم النسخ', 'Copied'])
                  : t(['نسخ العنوان كاملًا', 'Copy full address'])}
              </button>
              {address.lat !== null && address.lon !== null && (
                <a
                  className="btn secondary"
                  href={`https://www.google.com/maps/search/?api=1&query=${address.lat},${address.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  {t(['افتح في الخرائط', 'Open in Maps'])}
                </a>
              )}
            </div>
          </div>
          <dl className="naddr-details">
            {FIELD_KEYS.map((k) => (
              <div key={k}>
                <dt>{t(FIELD_LABELS[k])}</dt>
                <dd dir={NUMERIC[k] ? 'ltr' : undefined}>{address[k] || '—'}</dd>
              </div>
            ))}
            {address.region && (
              <div>
                <dt>{t(['المنطقة', 'Region'])}</dt>
                <dd>{address.region}</dd>
              </div>
            )}
          </dl>
          {copied === 'failed' && (
            <p className="naddr-note is-error">
              {t(['تعذر النسخ؛ حدد النص وانسخه.', 'Could not copy. Select the text instead.'])}
            </p>
          )}
        </section>
      )}

      <div className="naddr-grid">
        <section className="panel" aria-labelledby="naddr-fields-title">
          <h2 id="naddr-fields-title">{t(['بيانات العنوان', 'Address details'])}</h2>
          <p className="sub">
            {t([
              'للتوليد يكفي رقم المبنى والشارع والمدينة أو الرمز البريدي. تمتلئ البيانات تلقائيًا عند فك الرمز أو اختيار موقع على الخريطة.',
              'To generate, the building number, street and city or postal code are enough. The fields fill in by themselves from a code or the map.',
            ])}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void encode();
            }}
          >
            <div className="naddr-fields">
              {FIELD_KEYS.map((k) => (
                <div className="field" key={k}>
                  <label htmlFor={`naddr-${k}`}>{t(FIELD_LABELS[k])}</label>
                  <input
                    id={`naddr-${k}`}
                    value={fields[k]}
                    dir={NUMERIC[k] ? 'ltr' : undefined}
                    inputMode={NUMERIC[k] ? 'numeric' : 'text'}
                    maxLength={NUMERIC[k] ?? 120}
                    placeholder={t(SAMPLE[k])}
                    autoComplete="off"
                    onChange={(e) => setFields((old) => ({...old, [k]: e.target.value}))}
                  />
                </div>
              ))}
            </div>
            <div className="business-actions">
              <button className="btn" type="submit" disabled={busy !== null}>
                <Wand2 size={18} />
                {busy === 'fields'
                  ? t(['جارٍ التوليد…', 'Generating…'])
                  : t(['توليد العنوان المختصر', 'Generate short address'])}
              </button>
              <button type="button" className="business-reset" onClick={reset}>
                <RotateCcw size={16} />
                {t(['مسح الكل', 'Clear all'])}
              </button>
            </div>
            {note('fields')}
          </form>
        </section>

        <section className="panel naddr-map-panel" aria-labelledby="naddr-map-title">
          <div className="section-top">
            <h2 id="naddr-map-title">{t(['من الخريطة', 'From the map'])}</h2>
            <button
              type="button"
              className="btn secondary"
              onClick={locate}
              disabled={busy !== null}
            >
              <Crosshair size={16} />
              {t(['موقعي الحالي', 'My location'])}
            </button>
          </div>
          <p className="sub">
            {t([
              'اضغط على المبنى أو اسحب الدبوس، فتمتلئ البيانات والعنوان المختصر.',
              'Tap the building or drag the pin to fill in the details and the short address.',
            ])}
          </p>
          {/* Google owns everything inside the map element, so React renders
              nothing there; the loading state sits beside it as an overlay. */}
          <div className="naddr-map-wrap" aria-busy={mapState === 'loading'}>
            <div
              ref={mapEl}
              className="naddr-map"
              aria-label={t(['خريطة لاختيار المبنى', 'Map for picking the building'])}
            />
            {mapState !== 'ready' && (
              <div className="naddr-map-state">
                <MapPin size={26} />
                {mapState === 'failed'
                  ? t(['تعذر تحميل الخريطة.', 'The map could not load.'])
                  : t(['جارٍ تحميل الخريطة…', 'Loading the map…'])}
              </div>
            )}
          </div>
          {busy === 'map' && (
            <p className="naddr-note" role="status">
              {t(['جارٍ قراءة العنوان…', 'Reading the address…'])}
            </p>
          )}
          {note('map')}
        </section>
      </div>

      <section className="section business-guide">
        <h2>{t(['عن العنوان الوطني', 'About the national address'])}</h2>
        <details>
          <summary>
            {t(['ما هو العنوان الوطني المختصر؟', 'What is a short national address?'])}
          </summary>
          <p>
            {t([
              'رمز من ثماني خانات يختصر العنوان الوطني في المملكة العربية السعودية: أربعة أحرف تحدد المنطقة والمدينة والحي، ثم أربعة أرقام هي رقم المبنى. فالرمز QBWA4294 هو المبنى 4294 في حي المنتزه ببريدة.',
              'An eight-character code for a Saudi national address: four letters for the region, city and district, then the four-digit building number. QBWA4294 is building 4294 in Al Muntazah, Buraydah.',
            ])}
          </p>
        </details>
        <details>
          <summary>
            {t([
              'ما الفرق بين رقم المبنى والرقم الإضافي؟',
              'Building number or additional number?',
            ])}
          </summary>
          <p>
            {t([
              'رقم المبنى يميز المبنى في شارعه، والرقم الإضافي يحدد موقعه بدقة داخل الرمز البريدي. كلاهما أربعة أرقام، وتطلبهما شركات الشحن والفواتير الضريبية.',
              'The building number identifies the building on its street; the additional number pins it down within the postal code. Both are four digits, and couriers and tax invoices ask for both.',
            ])}
          </p>
        </details>
        <details>
          <summary>{t(['من أين تأتي البيانات؟', 'Where does the data come from?'])}</summary>
          <p>
            {t([
              'من بيانات خرائط Google التي تحمل العنوان الوطني لمعظم المباني. قد لا يظهر مبنى حديث جدًا، والمرجع الرسمي هو منصة العنوان الوطني من سُبل. لا نحفظ العناوين التي تبحث عنها.',
              'From Google Maps data, which carries the national address of most buildings. A very new building may be missing; the official record is SPL’s National Address service. Nothing you look up is stored.',
            ])}
          </p>
        </details>
      </section>
    </div>
  );
}

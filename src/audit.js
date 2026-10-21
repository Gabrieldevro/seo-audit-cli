// Analiza SEO on-page a unui document HTML. Fără dependențe: doar expresii regulate și reguli clare.

const decode = (s = '') =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');

const text = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null;
}

function metaContent(html, key, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ((attr(tag, key) || '').toLowerCase() === value) return attr(tag, 'content');
  }
  return null;
}

/** Extrage semnalele SEO dintr-o pagină HTML. */
export function extract(html, pageUrl) {
  const head = (html.match(/<head\b[\s\S]*?<\/head>/i) || [html])[0];
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const canonicalTag = (head.match(/<link\b[^>]*rel\s*=\s*["']?canonical[^>]*>/i) || [])[0];
  const images = (body.match(/<img\b[^>]*>/gi) || []).map(tag => ({
    src: attr(tag, 'src') || attr(tag, 'data-src'),
    alt: attr(tag, 'alt'),
    hasSize: attr(tag, 'width') !== null && attr(tag, 'height') !== null,
  }));
  const links = (body.match(/<a\b[^>]*>/gi) || []).map(tag => attr(tag, 'href')).filter(Boolean);
  const base = pageUrl ? new URL(pageUrl) : null;
  const internal = base ? links.filter(h => { try { return new URL(h, base).host === base.host; } catch { return false; } }) : [];
  const jsonLd = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = [].concat(data['@graph'] || data);
      for (const n of nodes) jsonLd.push([].concat(n['@type'] || 'Unknown').join(','));
    } catch {
      jsonLd.push('INVALID_JSON');
    }
  }
  return {
    lang: attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang'),
    title: text((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '') || null,
    description: metaContent(head, 'name', 'description'),
    robots: metaContent(head, 'name', 'robots'),
    viewport: metaContent(head, 'name', 'viewport'),
    canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => text(m[1])),
    h2Count: (body.match(/<h2\b/gi) || []).length,
    og: {
      title: metaContent(head, 'property', 'og:title'),
      description: metaContent(head, 'property', 'og:description'),
      image: metaContent(head, 'property', 'og:image'),
    },
    twitterCard: metaContent(head, 'name', 'twitter:card'),
    images,
    internalLinks: internal.length,
    jsonLd,
    words: text(body.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, '')).split(' ').filter(Boolean).length,
  };
}

/** Transformă semnalele în probleme, fiecare cu severitate și recomandare. */
export function evaluate(s, pageUrl) {
  const issues = [];
  const add = (level, code, message) => issues.push({ level, code, message });

  if (!s.title) add('error', 'title-missing', 'Lipsește <title>.');
  else if (s.title.length < 30) add('warning', 'title-short', `Titlul are ${s.title.length} caractere (ideal 30–60).`);
  else if (s.title.length > 60) add('warning', 'title-long', `Titlul are ${s.title.length} caractere și va fi tăiat în Google (ideal ≤ 60).`);

  if (!s.description) add('error', 'description-missing', 'Lipsește meta description.');
  else if (s.description.length < 70) add('warning', 'description-short', `Meta description are ${s.description.length} caractere (ideal 70–160).`);
  else if (s.description.length > 160) add('warning', 'description-long', `Meta description are ${s.description.length} caractere (ideal ≤ 160).`);

  if (s.h1.length === 0) add('error', 'h1-missing', 'Pagina nu are niciun H1.');
  else if (s.h1.length > 1) add('warning', 'h1-multiple', `Pagina are ${s.h1.length} H1 — păstrează unul singur.`);

  if (!s.canonical) add('warning', 'canonical-missing', 'Lipsește <link rel="canonical">.');
  else if (pageUrl) {
    const c = new URL(s.canonical, pageUrl);
    const p = new URL(pageUrl);
    if (c.host !== p.host) add('warning', 'canonical-cross-domain', `Canonical trimite pe alt domeniu: ${c.href}`);
  }

  if (s.robots && /noindex/i.test(s.robots)) add('error', 'noindex', `Pagina are robots="${s.robots}" și nu va fi indexată.`);
  if (!s.lang) add('warning', 'lang-missing', 'Lipsește atributul lang pe <html>.');
  if (!s.viewport) add('error', 'viewport-missing', 'Lipsește meta viewport (pagina nu e pregătită pentru mobil).');

  if (!s.og.title || !s.og.image) add('warning', 'og-incomplete', 'Open Graph incomplet (og:title / og:image) — distribuirea pe rețele arată slab.');
  if (!s.twitterCard) add('info', 'twitter-card-missing', 'Lipsește twitter:card (recomandat: summary_large_image).');

  const noAlt = s.images.filter(i => i.alt === null).length;
  if (noAlt) add('warning', 'img-alt-missing', `${noAlt} imagini fără atribut alt.`);
  const noSize = s.images.filter(i => !i.hasSize).length;
  if (noSize) add('info', 'img-size-missing', `${noSize} imagini fără width/height (risc de CLS).`);

  if (s.jsonLd.includes('INVALID_JSON')) add('error', 'jsonld-invalid', 'Un bloc JSON-LD nu este JSON valid.');
  else if (s.jsonLd.length === 0) add('info', 'jsonld-missing', 'Nu există date structurate (JSON-LD).');

  if (s.words < 300) add('info', 'thin-content', `Conținut principal scurt: ~${s.words} cuvinte.`);
  if (pageUrl && s.internalLinks < 3) add('info', 'few-internal-links', `Doar ${s.internalLinks} linkuri interne.`);

  const weight = { error: 15, warning: 5, info: 1 };
  const score = Math.max(0, 100 - issues.reduce((t, i) => t + weight[i.level], 0));
  return { score, issues };
}

/** Descarcă și analizează un URL. */
export async function auditUrl(url, { fetchImpl = fetch } = {}) {
  const started = Date.now();
  const res = await fetchImpl(url, { redirect: 'follow', headers: { 'user-agent': 'seo-audit-cli/1.0 (+https://github.com/Gabrieldevro/seo-audit-cli)' } });
  const html = await res.text();
  const signals = extract(html, res.url || url);
  const { score, issues } = evaluate(signals, res.url || url);
  if (res.status >= 400) issues.unshift({ level: 'error', code: 'http-status', message: `Răspuns HTTP ${res.status}.` });
  return { url, finalUrl: res.url || url, status: res.status, ms: Date.now() - started, bytes: html.length, score, signals, issues };
}

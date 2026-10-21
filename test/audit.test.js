import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extract, evaluate, auditUrl } from '../src/audit.js';

const good = `<!doctype html><html lang="ro"><head>
<title>Creare Site de Prezentare Rapid și Optimizat SEO</title>
<meta name="description" content="Site de prezentare modern, rapid și optimizat SEO pentru afacerea ta, cu design personalizat și formular de contact.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://exemplu.ro/servicii">
<meta property="og:title" content="Creare site"><meta property="og:image" content="https://exemplu.ro/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"ProfessionalService"},{"@type":"WebSite"}]}</script>
</head><body><h1>Creare site</h1><h2>Ce primești</h2>
<img src="a.jpg" alt="Captură" width="10" height="10">
<a href="/a">a</a><a href="/b">b</a><a href="https://exemplu.ro/c">c</a><a href="https://alt.ro">x</a>
<p>${'cuvânt '.repeat(320)}</p></body></html>`;

test('extrage semnalele principale', () => {
  const s = extract(good, 'https://exemplu.ro/servicii');
  assert.equal(s.lang, 'ro');
  assert.equal(s.title, 'Creare Site de Prezentare Rapid și Optimizat SEO');
  assert.equal(s.canonical, 'https://exemplu.ro/servicii');
  assert.deepEqual(s.h1, ['Creare site']);
  assert.deepEqual(s.jsonLd, ['ProfessionalService', 'WebSite']);
  assert.equal(s.internalLinks, 3);
});

test('o pagină bună primește scor maxim', () => {
  const { score, issues } = evaluate(extract(good, 'https://exemplu.ro/servicii'), 'https://exemplu.ro/servicii');
  assert.deepEqual(issues, []);
  assert.equal(score, 100);
});

test('detectează problemele clasice', () => {
  const bad = '<html><head><meta name="robots" content="noindex"></head><body><h1>A</h1><h1>B</h1><img src="x.png"><script type="application/ld+json">{oops}</script></body></html>';
  const codes = evaluate(extract(bad, 'https://exemplu.ro/'), 'https://exemplu.ro/').issues.map(i => i.code);
  for (const code of ['title-missing', 'description-missing', 'h1-multiple', 'canonical-missing', 'noindex', 'lang-missing', 'viewport-missing', 'img-alt-missing', 'jsonld-invalid']) {
    assert.ok(codes.includes(code), `lipsește ${code}`);
  }
});

test('auditUrl folosește fetch-ul primit și raportează statusul HTTP', async () => {
  const fakeFetch = async () => ({ status: 404, url: 'https://exemplu.ro/lipsa', text: async () => good });
  const r = await auditUrl('https://exemplu.ro/lipsa', { fetchImpl: fakeFetch });
  assert.equal(r.status, 404);
  assert.equal(r.issues[0].code, 'http-status');
});

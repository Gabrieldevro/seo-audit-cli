#!/usr/bin/env node
// CLI: seo-audit <url...> [--json] [--min-score=80]
import { auditUrl } from '../src/audit.js';

const args = process.argv.slice(2);
const urls = args.filter(a => !a.startsWith('--'));
const asJson = args.includes('--json');
const minScore = Number((args.find(a => a.startsWith('--min-score=')) || '').split('=')[1] || 0);

if (urls.length === 0) {
  console.log('Utilizare: seo-audit <url> [url...] [--json] [--min-score=80]');
  process.exit(1);
}

const colors = { error: '\x1b[31m', warning: '\x1b[33m', info: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };
const icon = { error: '✖', warning: '▲', info: 'ℹ' };
const c = (k, s) => (process.stdout.isTTY ? colors[k] + s + colors.reset : s);

const reports = [];
for (const url of urls) {
  try {
    reports.push(await auditUrl(url));
  } catch (err) {
    reports.push({ url, error: err.message, score: 0, issues: [] });
  }
}

if (asJson) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  for (const r of reports) {
    console.log('\n' + c('bold', r.url));
    if (r.error) { console.log(c('error', `  ✖ Nu am putut descărca pagina: ${r.error}`)); continue; }
    const s = r.signals;
    console.log(c('dim', `  HTTP ${r.status} · ${r.ms} ms · ${(r.bytes / 1024).toFixed(1)} KB`));
    console.log(`  Title       ${s.title ?? '—'}`);
    console.log(`  Description ${s.description ? s.description.slice(0, 90) + (s.description.length > 90 ? '…' : '') : '—'}`);
    console.log(`  H1          ${s.h1.join(' | ') || '—'}`);
    console.log(`  Canonical   ${s.canonical ?? '—'}`);
    console.log(`  JSON-LD     ${s.jsonLd.join(', ') || '—'}`);
    console.log(`  Scor        ${c(r.score >= 80 ? 'info' : r.score >= 50 ? 'warning' : 'error', r.score + '/100')}`);
    for (const i of r.issues) console.log(`  ${c(i.level, icon[i.level])} ${i.message}`);
  }
}

process.exit(reports.some(r => r.score < minScore) ? 2 : 0);

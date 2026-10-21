<h1 align="center">🔎 seo-audit-cli</h1>

<p align="center">Audit SEO on-page direct din terminal — fără dependențe, fără API key, gata de pus în CI.</p>

<p align="center">
<img alt="Node.js" src="https://img.shields.io/badge/Node.js-%E2%89%A518-5FA04E?style=for-the-badge&amp;logo=nodedotjs&amp;logoColor=white">
<img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-success?style=for-the-badge">
<img alt="License MIT" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge">
</p>

---

## Ce verifică

| Zonă | Verificări |
|---|---|
| **Meta** | `<title>` (lipsă / prea scurt / prea lung), meta description, `lang`, viewport, `robots: noindex` |
| **Structură** | număr de H1 (exact unul), H2, cuvinte în conținutul principal, linkuri interne |
| **Indexare** | `rel="canonical"` (lipsă sau pe alt domeniu), status HTTP |
| **Social** | Open Graph (`og:title`, `og:image`), `twitter:card` |
| **Date structurate** | blocuri JSON-LD (tipuri detectate + JSON invalid) |
| **Imagini** | `alt` lipsă, `width`/`height` lipsă (risc de CLS) |

Fiecare problemă are o severitate (`error`, `warning`, `info`), iar pagina primește un **scor 0–100**.

## Utilizare

```bash
git clone https://github.com/Gabrieldevro/seo-audit-cli.git
cd seo-audit-cli
node bin/seo-audit.js https://exemplu.ro https://exemplu.ro/contact
```

```text
https://gabrieldev.eu/servicii/website-de-prezentare
  HTTP 200 · 1114 ms · 63.4 KB
  Title       Creare Site de Prezentare Rapid și Optimizat SEO | Gabriel Dev
  H1          Website de Prezentare
  Canonical   https://gabrieldev.eu/servicii/website-de-prezentare
  JSON-LD     BreadcrumbList, WebSite, ProfessionalService
  Scor        93/100
  ▲ Titlul are 62 caractere și va fi tăiat în Google (ideal ≤ 60).
  ℹ 6 imagini fără width/height (risc de CLS).
```

### Opțiuni

| Opțiune | Efect |
|---|---|
| `--json` | raport complet în JSON (pentru scripturi și dashboard-uri) |
| `--min-score=80` | iese cu codul `2` dacă o pagină are scor sub prag — perfect pentru CI |

### În GitHub Actions

```yaml
- run: node bin/seo-audit.js https://site-ul-tau.ro --min-score=85
```

### Ca bibliotecă

```js
import { auditUrl } from './src/audit.js';

const report = await auditUrl('https://exemplu.ro');
console.log(report.score, report.issues);
```

## Teste

```bash
npm test
```

Testele rulează offline, pe HTML de test, cu `node:test` (fără framework extern).

---

<p align="center">Făcut de <a href="https://gabrieldev.eu"><b>Gabriel Dev</b></a> — creare site-uri, magazine online și SEO tehnic.<br>
Ai nevoie de un audit complet sau de optimizare? <a href="https://gabrieldev.eu/contact">Scrie-mi</a>.</p>

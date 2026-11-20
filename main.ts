// Vice Coast Cover Maker entry program (Node 22, standard library only).
// The entry is a folder of static files: app/ holds the offline cover maker
// (index.html plus its ES modules, styles, sample photos and OFL fonts) and
// screenshots/ holds the screenshots taken while building it. This program
// hands both folders in: it copies them into the output directory the grader
// provides and writes dossier.json there, using the vendored make.fun
// library's buildDossier, which is the summary the judge reads.
//
// Run it locally to check the handover:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself with `node serve.ts` and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps for this bounty (reference/gate.json): the dossier text
// is capped at 160 KiB, at most 4 screenshots of at most 256 KiB each, and
// app/ stays under 993 files and 48 MiB in all with no path over 1000 bytes,
// so the whole output fits the platform's own 1000-entry, 64 MiB ceiling.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

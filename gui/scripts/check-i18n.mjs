// Walk gui/src-ui/i18n/{en,ru,zh}.json and compare key trees. Prints any
// path that exists in one file but not another, and any leaf value that
// is still equal to the English source in a translated locale (a strong
// hint that a string never got localised).
//
// Designed to be run from `pnpm i18n:check`; exits non-zero on missing
// keys so it can be wired into CI later.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../src-ui/i18n');

const LOCALES = ['en', 'ru', 'zh'];
const REFERENCE = 'en';

// Values that legitimately stay the same across locales — proper names,
// abbreviations the daemon expects, units we render verbatim.
const SHARED_VALUES = new Set([
  'app.name',
  'settings.temp.celsius',
  'settings.temp.fahrenheit',
  'settings.daemon_group',
  'settings.daemon.endpoint_value',
  'settings.about.license',
  'led.preset.smooth',
  'led.preset.ping',
  // The five battery-limit identifiers are PascalCase tags that match
  // ipc::ChargeLimit variants; only the *_desc keys carry prose.
  'battery.limit.FullCapacity',
  'battery.limit.HighCapacity',
  'battery.limit.Balanced',
  'battery.limit.MaximumLifespan',
  'battery.limit.DeskMode',
]);

function readLocale(code) {
  const file = path.join(dir, `${code}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectKeys(obj, prefix = '') {
  const out = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      for (const [pp, vv] of collectKeys(v, p)) out.set(pp, vv);
    } else {
      out.set(p, v);
    }
  }
  return out;
}

const tables = Object.fromEntries(
  LOCALES.map((c) => [c, collectKeys(readLocale(c))]),
);

const refKeys = new Set(tables[REFERENCE].keys());

let problems = 0;

for (const code of LOCALES) {
  if (code === REFERENCE) continue;

  const localeKeys = new Set(tables[code].keys());

  const missing = [...refKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !refKeys.has(k));
  const untranslated = [...refKeys]
    .filter((k) => localeKeys.has(k))
    .filter((k) => !SHARED_VALUES.has(k))
    .filter((k) => tables[REFERENCE].get(k) === tables[code].get(k));

  if (missing.length) {
    problems += missing.length;
    console.log(`\n[${code}] missing ${missing.length} keys from ${REFERENCE}:`);
    for (const k of missing) console.log(`  - ${k}`);
  }
  if (extra.length) {
    problems += extra.length;
    console.log(`\n[${code}] has ${extra.length} keys not present in ${REFERENCE}:`);
    for (const k of extra) console.log(`  - ${k}`);
  }
  if (untranslated.length) {
    // Doesn't bump `problems` — these are warnings, not errors.
    console.log(
      `\n[${code}] ${untranslated.length} keys are identical to ${REFERENCE} (possibly untranslated):`,
    );
    for (const k of untranslated.slice(0, 20)) {
      console.log(`  - ${k} = "${tables[code].get(k)}"`);
    }
    if (untranslated.length > 20) {
      console.log(`  ... and ${untranslated.length - 20} more`);
    }
  }
}

if (problems === 0) {
  console.log('All locales have the same key set as the English reference.');
  process.exit(0);
}
console.log(`\n${problems} structural problems found.`);
process.exit(1);

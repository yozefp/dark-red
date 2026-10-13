/**
 * Doplní do zostaveného service workera zoznam súborov aj verziu.
 * Verzia je odvodená z obsahu, takže nové nasadenie si vyčistí starú cache
 * a staré nasadenie sa nedá omylom podať z cache ďalej.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const DIST = 'dist';
const SKIP = new Set(['sw.js', 'config.json', '_headers']);  // config nesmie byť v precache
/** Panel je pre teba, nie pre tablet — do offline cache hry nepatrí. */
const SKIP_RE = [/^\/panel\.html$/, /^\/test\.html$/, /^\/assets\/panel-/, /^\/prototype\//];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(DIST)
  .map((f) => '/' + relative(DIST, f).split(/[\\/]/).join('/'))
  .filter((p) => !SKIP.has(p.slice(1)) && !SKIP_RE.some((re) => re.test(p)))
  .sort();

const hash = createHash('sha1');
for (const f of files) hash.update(readFileSync(join(DIST, f.slice(1))));
// aj samotné pravidlá offline vrstvy — zmena v nich musí vyčistiť starú cache
hash.update(readFileSync('public/sw.js'));
const version = `tdr-${hash.digest('hex').slice(0, 10)}`;

const swPath = join(DIST, 'sw.js');
const src = readFileSync(swPath, 'utf-8')
  .replace("const VERSION = 'tdr-dev';", `const VERSION = '${version}';`)
  .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files)};`);

writeFileSync(swPath, src);
console.log(`sw.js — ${version}, ${files.length} súborov v precache`);

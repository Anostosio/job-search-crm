import {copyFile, cp, mkdir, readFile, rm} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

await rm(dist, {recursive:true, force:true});
await mkdir(dist, {recursive:true});

const rootFiles = [
  'index.html',
  'app.js',
  'privacy.js',
  'fonts.css',
  'privacy.css',
  'style.css',
  'favicon.svg',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'google2fe5591a71bf2d9d.html'
];

for (const file of rootFiles) await copyFile(join(root, file), join(dist, file));
for (const directory of ['assets', 'lib']) await cp(join(root, directory), join(dist, directory), {recursive:true});

const fontDir = join(dist, 'assets', 'fonts');
const licenseDir = join(fontDir, 'licenses');
await mkdir(licenseDir, {recursive:true});

const fontFiles = [
  ['@fontsource-variable/manrope', 'manrope-cyrillic-wght-normal.woff2'],
  ['@fontsource-variable/manrope', 'manrope-latin-wght-normal.woff2'],
  ['@fontsource-variable/unbounded', 'unbounded-cyrillic-wght-normal.woff2'],
  ['@fontsource-variable/unbounded', 'unbounded-latin-wght-normal.woff2']
];

for (const [pkg, file] of fontFiles) {
  await copyFile(join(root, 'node_modules', pkg, 'files', file), join(fontDir, file));
}

await copyFile(join(root, 'node_modules', '@fontsource-variable/manrope', 'LICENSE'), join(licenseDir, 'Manrope-OFL.txt'));
await copyFile(join(root, 'node_modules', '@fontsource-variable/unbounded', 'LICENSE'), join(licenseDir, 'Unbounded-OFL.txt'));

const runtimeFiles = ['index.html', 'app.js', 'privacy.js', 'fonts.css', 'privacy.css', 'style.css'];
const forbidden = ['fonts.googleapis.com', 'fonts.gstatic.com', 'mc.yandex.ru', 'metrika/tag.js', '/api/parse-vacancy'];
for (const file of runtimeFiles) {
  const text = await readFile(join(dist, file), 'utf8');
  for (const token of forbidden) {
    if (text.includes(token)) throw new Error(`Runtime build contains forbidden external/privacy token ${token} in ${file}`);
  }
}

console.log('Built static local-first app in dist/ with self-hosted fonts.');

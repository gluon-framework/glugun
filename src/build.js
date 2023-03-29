import { cp, writeFile, readFile, readdir, rm, mkdir, stat, access, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import * as Esbuild from 'esbuild';
import * as HTMLMinifier from 'html-minifier-terser';

import * as Platforms from './platforms.js';
import downloadGlustrap from './glustrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const esbuildPlugin = { // esbuild to fix some things in src files
  name: 'glugun-esbuild',
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      let source = await readFile(args.path, 'utf8');

      source = source
        .replace(`const __filename = fileURLToPath(import.meta.url);\r\nconst __dirname = dirname(__filename);`, ''); // remove setting __filename/__dirname cause ESM -> CJS

      return { contents: source };
    });
  }
};

const exists = path => access(path).then(() => true).catch(() => false);

const dirSize = async dir => {
  const files = await readdir(dir, { withFileTypes: true });

  const paths = files.map(async file => {
    const path = join(dir, file.name);

    if (file.isDirectory()) return await dirSize(path);
    if (file.isFile()) return (await stat(path)).size;

    return 0;
  });

  return (await Promise.all(paths)).flat(Infinity).reduce((acc, x) => acc + x, 0);
};


global.buildDir = join(__dirname, '..', 'build');
global.outDir = join(__dirname, '..', 'out');
global.cacheDir = join(__dirname, '..', 'cache');

export default async (name, dir) => {
  // reset build dir
  await rm(buildDir, { recursive: true, force: true });
  await mkdir(buildDir, { recursive: true });

  const appDir = join(buildDir, 'app');
  await cp(dir, appDir, { recursive: true }); // copy project src to build

  // strip backend
  for (const m of [ 'ws', '@gluon-framework/gluon' ]) {
    const path = join(appDir, 'node_modules', m);

    for (const x of await readdir(path)) {
      if (
        x.endsWith('.d.ts') || // typedef
        x.endsWith('.md') || // markdown
        m === 'ws' && ( // extra unused files in ws
          x === 'browser.js' ||
          x === 'index.js'
        )
      ) await rm(join(path, x), { recursive: true, force: true });
    }
  }

  await rm(join(appDir, 'gluon_data'), { recursive: true, force: true });
  await rm(join(appDir, 'package-lock.json'), { force: true });
  await rm(join(appDir, 'node_modules', '.package-lock.json'), { force: true });
  await rm(join(appDir, 'node_modules', '.bin'), { recursive: true, force: true });

  await writeFile(join(buildDir, `${name}.bat`), `node %~dp0app`);

  if (minifyBackend) {
    log(`Pre-minify build size: ${((await dirSize(buildDir)) / 1024 / 1024).toFixed(2)}MB`);

    const tmpMinDir = join(buildDir, 'mintmp');

    await Esbuild.build({ // bundle and minify into 1 file
      entryPoints: [ join(appDir, 'index.js') ],
      bundle: true,
      minify: true,
      format: 'iife',
      platform: 'node',
      outfile: join(tmpMinDir, 'index.js'),
      plugins: [ esbuildPlugin ]
    });

    const htmlPath = join(appDir, 'index.html');
    if (await exists(htmlPath)) {
      const content = await readFile(htmlPath, 'utf8');
      await writeFile(join(tmpMinDir, 'index.html'), await HTMLMinifier.minify(content));
    }

    await writeFile(join(tmpMinDir, 'package.json'), JSON.stringify({}));

    await rm(appDir, { recursive: true }); // delete original app
    await rename(tmpMinDir, appDir); // move mintmp to app
  }

  if (makeBinaries) {
    log('Making binaries... (EXPERIMENTAL!)');

    await mkdir(join(cacheDir, 'glustrap'), { recursive: true });

    for (const given of binaryPlatforms) {
      const [ plat, arch = Platforms.currentArch ] = given.split('-');
      log(`Building ${plat} ${arch}`);

      const dir = join(outDir, `${plat}-${arch}`);
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });

      await downloadGlustrap({ plat, arch }, join(dir, name + (plat === 'win' ? '.exe' : '')));
      await cp(appDir, join(dir, 'app'), { recursive: true, force: true });
    }
  }
};
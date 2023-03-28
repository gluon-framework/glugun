import { readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';

import * as Platforms from './platforms.js';

import Build from './build.js';
import Wrap from './wrap.js';

const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
global.log = (...args) => console.log(`[${rgb(235, 69, 158, 'Glugun')}]`, ...args);

global.minifyBackend = process.argv.includes('--minify');
global.makeBinaries = !process.argv.includes('--no-binaries');

const getOption = arg => {
  const ind = process.argv.indexOf(arg);
  if (ind === -1) return undefined;

  return process.argv[ind + 1];
};

global.binaryPlatforms = (getOption('--platforms') ?? Platforms.currentPlatform).split(',');
if (binaryPlatforms[0] === 'all') binaryPlatforms = Platforms.all;

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

const build = async (dir, platform = 'win32') => {
  const name = basename(dir);

  if (minifyBackend) log(`Minifying is experimental!`);

  console.log();
  const startTime = performance.now();
  switch (platform) {
    case 'win32': await Build(name, dir);
  }

  log(`Finished build in: ${((performance.now() - startTime) / 1024).toFixed(2)}s`);
  log(`Final build size: ${((await dirSize(outDir)) / 1024 / 1024).toFixed(2)}MB`);

  process.exit(0);
};

const [ cmd, dir ] = process.argv.slice(2);
const name = dir && basename(dir);

switch (cmd) {
  case 'build':
    await build(dir);
    break;

  case 'run':
    await build(dir);
    log('Running...');

    if (embedNode) execSync(`build\\${name}.exe`, { stdio: 'inherit' });
      else execSync(`.\\build\\${name}.bat`, { stdio: 'inherit' });

    break;

  case 'wrap':
    break;

  default:
    if (cmd) log(`No command "${cmd}"!`);
    console.log(`glugun [build/run] {path} [--minify] (extra args to pass if running)`);
    break;
}
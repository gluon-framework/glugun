import { join } from 'path';
import { readFile, writeFile, rm, readdir } from 'fs/promises';

const internalApis = [ 'ipc', 'local' ];
export default async (appDir, apisToKeep = []) => {
  const gluonDir = join(appDir, 'node_modules', '@gluon-framework', 'gluon');

  const importer = join(gluonDir, 'src', 'launcher', 'inject.js');
  const apiDir = join(gluonDir, 'src', 'api');

  const allApis = (await readdir(apiDir)).map(x => x.replace('.js', '')).concat(internalApis)
  const apis = allApis.filter(x => !apisToKeep.includes(x));
  log('Shaking APIs:', apis.join(', '));

  const importNames = apis.map(x => x[0].toUpperCase() + x.slice(1) + 'Api');
  await writeFile(importer, (await readFile(importer, 'utf8')).split('\n')
    .filter(x => !importNames.some(y => x.includes(y)))
    .join('\n'));

  for (const api of apis) {
    if (internalApis.includes(api)) continue;

    const file = join(apiDir, api + '.js');
    await rm(file);
  }

  if (apis.includes('ipc')) {
    await writeFile(importer, (await readFile(importer, 'utf8')).split('\n')
      .filter(x => !x.toLowerCase().includes('ipc'))
      .join('\n'));

    await rm(join(gluonDir, 'src', 'lib', 'ipc.js'));
  }

  if (apis.includes('local')) {
    await writeFile(importer, (await readFile(importer, 'utf8')).split('\n')
      .filter(x => !x.includes('LocalCDP'))
      .join('\n'));

    await writeFile(join(gluonDir, 'src', 'index.js'), (await readFile(join(gluonDir, 'src', 'index.js'), 'utf8')).split('\n')
      .filter(x => !x.includes('LocalHTTP'))
      .join('\n'));

    await rm(join(gluonDir, 'src', 'lib', 'local'), { recursive: true });
    await rm(join(gluonDir, 'src', 'lib', 'mimeType.js'));
  }
};
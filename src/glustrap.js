import { get } from 'https';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { access, copyFile } from 'fs/promises';

const baseUrl = `https://github.com/gluon-framework/glustrap/releases/download/0.1.0/glustrap`;

const exists = path => access(path).then(() => true).catch(() => false);

const download = (url, path, cachePath = join(global.cacheDir, 'glustrap', url.replace(baseUrl, '').slice(1))) => new Promise(async resolve => {
  if (await exists(cachePath)) return copyFile(cachePath, path).then(resolve);

  get(url, res => {
    const redir = res.headers.location;
    if (redir) return download(redir, path, cachePath).then(resolve);

    const file = createWriteStream(cachePath);
    res.pipe(file);

    file.on('finish', async () => {
      await copyFile(cachePath, path);
      resolve();
    });
  });
});

export default ({ plat, arch }, path) => download(`${baseUrl}_${plat}_${arch}${plat === 'win' ? '.exe' : ''}`, path);
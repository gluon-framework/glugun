import { get } from 'https';
import { createWriteStream } from 'fs';

const baseUrl = `https://github.com/gluon-framework/glustrap/releases/download/0.1.0/glustrap`;

const download = (url, path) => new Promise(resolve => {
  get(url, res => {
    const redir = res.headers.location;
    if (redir) return download(redir, path).then(resolve);

    const file = createWriteStream(path);
    res.pipe(file);

    file.on('finish', resolve);
  });
});

export default ({ plat, arch }, path) => download(`${baseUrl}_${plat}_${arch}${plat === 'win' ? '.exe' : ''}`, path);
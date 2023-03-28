export const platforms = [ 'win', 'linux', 'mac' ];
export const archs = {
  win: [ 'x64', 'x86', 'arm64' ],
  linux: [ 'x64', 'x86' ],
  mac: [ 'x64', 'arm64' ]
};

export const all = platforms.flatMap(x => archs[x].map(y => `${x}-${y}`));

export const currentPlatform = ({
  win32: 'win',
  darwin: 'mac'
})[process.platform] ?? process.platform;

export const currentArch = ({
  ia32: 'x86'
})[process.arch] ?? process.arch;
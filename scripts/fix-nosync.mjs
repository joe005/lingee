// 维持 node_modules 的 .nosync 模式，避免 iCloud 跨架构同步原生模块。
// 平时：node_modules 是指向 node_modules.nosync 的符号链接（iCloud 跳过 .nosync 后缀）。
// npm install 无法容忍 node_modules 是符号链接，故 preinstall 切回真实目录，postinstall 切回符号链接。
import { existsSync, lstatSync, renameSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';

const phase = process.env.npm_lifecycle_event;
const nm = 'node_modules';
const nosync = 'node_modules.nosync';

const isSymlink = (p) => {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

if (phase === 'preinstall') {
  // npm 需要真实目录来写入，把符号链接切回真实目录
  if (isSymlink(nm)) {
    unlinkSync(nm);
    if (existsSync(nosync)) renameSync(nosync, nm);
  }
} else if (phase === 'postinstall') {
  // 安装完成，切回 .nosync 符号链接模式
  if (existsSync(nm) && !isSymlink(nm)) {
    if (existsSync(nosync)) rmSync(nosync, { recursive: true, force: true });
    renameSync(nm, nosync);
    symlinkSync('node_modules.nosync', nm);
  }
}

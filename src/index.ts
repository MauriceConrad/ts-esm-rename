#! /usr/bin/env node
import { parse } from 'ts-command-line-args';
import fs from 'fs/promises'
import path from 'path'


interface ITSESMRenameArguments{
  target: string;
  regexImportStatement: string;
  regexFilename: string;
}

export const args = Object.assign({
  ['regex-import-statement']: `^\\s*(import|export)\\s{1,}(.*)\\s{1,}from\\s{1,}("|')(\\.{1,2}\\/.*)("|');?\\s*$`,
  ['regex-filename']: `\\.js$`
}, parse<ITSESMRenameArguments>({
  target: {
    type: String,
    alias: 't',
    defaultOption: true
  },
  regexImportStatement: {
    type: String,
    alias: 'i'
  },
  regexFilename: {
    type: String,
    alias: 'f'
  }
}));

const target = args.target;



const regexImportStatement = new RegExp(args['regex-import-statement']);
const regexFilename = new RegExp(args['regex-filename']);

async function lookup(dir: string, handler: (item: string) => void, maxLevel = Infinity, level = 0) {
  const entries = await fs.readdir(dir);
  for (const item of entries) {
    const itemPath = path.resolve(dir, item);
    const stat = await fs.stat(itemPath);
    if (stat.isFile() && regexFilename.test(item)) {
      handler(itemPath);
    }
    if (stat.isDirectory() && level < maxLevel) {
      lookup(itemPath, handler, maxLevel, level + 1);
    }
  }
}

lookup(target, async (item) => {
  const contents = await fs.readFile(item, 'utf8');
  const lines = await Promise.all(contents.split('\n').map(async line => {
    if (regexImportStatement.test(line)) {
      const importMatching = line.match(regexImportStatement);
      if (importMatching) {
        const destination = importMatching[4];
        const destinationFile = await (async () => {
          const destinationPath = path.resolve(item, '..', destination);
          try {
            const stats = await fs.stat(destinationPath);
            if (stats.isDirectory()) {
              const dirsEntries = await fs.readdir(destinationPath);
              for (const entryName of dirsEntries) {
                if (/^index\.(js|mjs|cjs|ts)$/.test(entryName)) {
                  return path.resolve(destinationPath, 'index');
                }
              }
            }
          }
          catch {}
          return destinationPath;
        })();
        const destinationFolder = path.resolve(destinationFile, '..');
        const folderFiles = await fs.readdir(destinationFolder);
        const targetFile = folderFiles.find(itemName => {
          const parts = itemName.split('.');
          return parts.slice(0, -1).join('.') === path.basename(destinationFile) || path.basename(destinationFile) === itemName;
        });
        if (targetFile) {
          const target = path.relative(path.resolve(item, '..'), path.resolve(destinationFolder, targetFile));
          return line.replace(destination, /\.\//.test(target) ? target : `./${ target }`);
        }
      }
    }
    return line;
  }));
  await fs.writeFile(item, lines.join('\n'));
});
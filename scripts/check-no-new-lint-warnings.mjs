#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const JS_TS_FILE_PATTERN = /\.(?:[cm]?js|[cm]?jsx|[cm]?ts|[cm]?tsx)$/i;

const parseArgs = (argv) => {
  const files = [];
  let fromRef;
  let toRef;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--from-ref') {
      fromRef = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === '--to-ref') {
      toRef = argv[index + 1];
      index += 1;
      continue;
    }
    files.push(value);
  }

  return { files, fromRef, toRef };
};

const run = (command, args) => {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  });
};

const listChangedFiles = (fromRef, toRef) => {
  const range = `${fromRef}...${toRef}`;
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', range], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Failed to diff changed files for range ${range}\n`);
    process.exit(result.status ?? 1);
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const normalizeFileList = (candidates) => {
  return candidates
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => JS_TS_FILE_PATTERN.test(file))
    .filter((file) => fs.existsSync(path.resolve(process.cwd(), file)));
};

const { files, fromRef, toRef } = parseArgs(process.argv.slice(2));
const candidates = files.length > 0 ? files : fromRef && toRef ? listChangedFiles(fromRef, toRef) : [];
const lintTargets = normalizeFileList(candidates);

if (lintTargets.length === 0) {
  console.log('[lint:no-new-warnings] No changed JS/TS files to check.');
  process.exit(0);
}

console.log(`[lint:no-new-warnings] Checking ${lintTargets.length} changed file(s) for new lint warnings...`);

const result = run('bunx', ['oxlint', '--deny-warnings', ...lintTargets]);
process.exit(result.status ?? 1);

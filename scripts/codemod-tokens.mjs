#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app'];
const EXTENSIONS = ['.ts', '.tsx', '.css', '.scss'];
const DRY_RUN = process.argv.includes('--dry-run');

// Files to exclude from token replacement (they contain both bolt: and devx: namespaces)
const EXCLUDE_FILES = [
  'app/styles/variables.scss',
  'uno.config.ts'
];

function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

const PATTERN = /\bbolt-elements-/g;
const REPLACEMENT = 'devx-elements-';

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'build') {
        walk(fullPath, files);
      }
    } else if (EXTENSIONS.includes(extname(entry.name))) {
      // Check if file should be excluded
      const relPath = normalizePath(relative(ROOT, fullPath));
      if (!EXCLUDE_FILES.includes(relPath)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const matches = content.match(PATTERN);
  if (!matches) return { file: filePath, count: 0, changed: false };
  const newContent = content.replace(PATTERN, REPLACEMENT);
  const changed = newContent !== content;
  if (!DRY_RUN && changed) {
    writeFileSync(filePath, newContent, 'utf8');
  }
  return { file: relative(ROOT, filePath), count: matches.length, changed };
}

function main() {
  console.log(DRY_RUN ? 'DRY-RUN MODE' : 'WRITE MODE');
  console.log('============================================================');
  let allFiles = [];
  for (const target of TARGET_DIRS) {
    const fullPath = join(ROOT, target);
    if (statSync(fullPath).isDirectory()) {
      allFiles.push(...walk(fullPath));
    } else if (statSync(fullPath).isFile()) {
      allFiles.push(fullPath);
    }
  }
  const results = allFiles.map(processFile).filter(r => r.count > 0);
  const totalFiles = results.length;
  const totalReplacements = results.reduce((sum, r) => sum + r.count, 0);
  console.log('\nFiles with occurrences: ' + totalFiles);
  console.log('Total replacements: ' + totalReplacements);
  console.log('\nDetails:');
  for (const r of results) {
    console.log('  ' + r.file + ': ' + r.count + ' occurrence(s)');
  }
  if (DRY_RUN) {
    console.log('\nDry-run completed. No files were modified.');
    console.log('   Run without --dry-run to apply.');
  } else {
    console.log('\nChanges applied.');
  }
  if (totalReplacements === 0) {
    console.log('\nWarning: No occurrences found. Check the pattern.');
  }
}

main();

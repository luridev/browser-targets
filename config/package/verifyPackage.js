import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(import.meta.url);

function run(command, args, cwd = root, capture = false) {
  const label = `${command} ${args.join(' ')}`;
  const env = { ...process.env };
  delete env.NODE_PATH;
  process.stdout.write(`[package] ${label}\n`);

  const result = spawn.sync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['inherit', capture ? 'pipe' : 'inherit', 'inherit'],
  });

  if (result.error != null || result.status !== 0 || result.signal != null) {
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }

    throw new Error(`${label} failed (exit ${result.status}, signal ${result.signal}).`, { cause: result.error });
  }

  return result.stdout;
}

run('npm', ['test']);

const temporaryDirectory = realpathSync(tmpdir());
const temporaryRoot = realpathSync(mkdtempSync(join(temporaryDirectory, 'protoapps-browser-targets-')));

assert.equal(dirname(temporaryRoot), temporaryDirectory);
assert.ok(basename(temporaryRoot).startsWith('protoapps-browser-targets-'));
process.stdout.write(`[package] Temporary root: ${temporaryRoot}\n`);

try {
  const packed = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryRoot], root, true));

  assert.equal(packed.length, 1, 'npm pack must produce one archive.');

  const { filename, size, unpackedSize, files } = packed[0];

  assert.equal(basename(filename), filename);
  assert.deepEqual(files.map((file) => file.path).sort(), [
    'LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js', 'package.json',
  ].sort());
  process.stdout.write(`${JSON.stringify({ filename, size, unpackedSize, files }, null, 2)}\n`);

  const archive = join(temporaryRoot, filename);

  run('npm', ['exec', '--offline', '--no', '--', 'publint', archive, '--strict']);

  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const typescriptVersion = JSON.parse(readFileSync(require.resolve('typescript/package.json'), 'utf8')).version;
  const consumer = join(temporaryRoot, 'consumer');

  cpSync(join(root, 'tests/fixtures/package-consumer'), consumer, { recursive: true });
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`);

  run('npm', [
    'install', '--no-audit', '--no-fund', '--ignore-scripts', '--include=dev',
    archive, `typescript@${typescriptVersion}`,
  ], consumer);

  const installedPackage = realpathSync(join(consumer, 'node_modules', manifest.name));

  assert.ok(installedPackage.startsWith(`${consumer}${sep}`));
  run(process.execPath, [join(consumer, 'node_modules/typescript/bin/tsc'), '--noEmit'], consumer);
  run(process.execPath, [join(consumer, 'runtime.mjs')], consumer);
  process.stdout.write('Package verified successfully.\n');
} finally {
  assert.equal(dirname(realpathSync(temporaryRoot)), temporaryDirectory);
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

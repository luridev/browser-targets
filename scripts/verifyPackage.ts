import assert from 'node:assert/strict';
import { cpSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunner, lintPackage, packPackage, withTemporaryDirectory } from '@protoapps/package-verifier';

type PackageManifest = {
  name: string;
  version: string;
  exports: Record<string, { types: string; default: string }>;
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type PackageLock = {
  packages: Record<string, unknown>;
};

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(import.meta.url);

const runner = createRunner({ cwd: root, output: 'inherit', timeout: 600_000 });

await withTemporaryDirectory(async (temporaryRoot) => {
  const { path: archive } = await packPackage({ cwd: root, destination: temporaryRoot, runner });
  await lintPackage(archive);

  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageManifest;
  const typescriptVersion = (JSON.parse(readFileSync(require.resolve('typescript/package.json'), 'utf8')) as PackageManifest).version;
  const consumer = join(temporaryRoot, 'consumer');

  cpSync(join(root, 'tests/fixtures/package-consumer'), consumer, { recursive: true });
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`);

  runner.npm([
    'install', '--no-audit', '--no-fund', '--ignore-scripts', '--include=dev',
    archive, `typescript@${typescriptVersion}`,
  ], { cwd: consumer });

  const installedPackage = realpathSync(join(consumer, 'node_modules', manifest.name));

  assert.ok(installedPackage.startsWith(`${consumer}${sep}`));
  const installedManifest = JSON.parse(readFileSync(join(installedPackage, 'package.json'), 'utf8')) as PackageManifest;

  assert.deepEqual(installedManifest.exports, { '.': { types: './dist/index.d.ts', default: './dist/index.js' } });
  assert.deepEqual(installedManifest.dependencies, manifest.dependencies);
  assert.deepEqual(installedManifest.peerDependencies ?? {}, {});
  assert.deepEqual(installedManifest.optionalDependencies ?? {}, {});
  const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8')) as PackageLock;

  for (const name of ['@protoapps/package-verifier', '@protoapps/eslint-config', 'eslint', '@vitest/eslint-plugin', 'vitest', 'jiti', 'rimraf']) {
    assert.ok(!Object.keys(lock.packages).some((path) => path.endsWith(`node_modules/${name}`)),
      `Unexpected runtime dependency: ${name}`);
  }

  runner.npm(['ls', '--all'], { cwd: consumer });
  runner.node([join(consumer, 'node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: consumer });
  runner.node([join(consumer, 'runtime.mjs')], { cwd: consumer });
  process.stdout.write('Package verified successfully.\n');
}, { prefix: 'protoapps-browser-targets-' });

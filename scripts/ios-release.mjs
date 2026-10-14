// Prepares a reviewable native archive from a clean production source tree.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit', env: { ...process.env, VITE_TESTER: '0' } });
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
// Check source and hosted pages before invoking any build or changing native versions.
export function assertNoReleasePlaceholders(root = '.') {
  const hits = ['src', 'site'].flatMap((dir) =>
    walk(join(root, dir)).filter((path) => /YOUR-DOMAIN|YOUR-SITE/i.test(readFileSync(path, 'utf8'))),
  );
  if (hits.length) throw new Error(`Release contact placeholders remain: ${hits.join(', ')}`);
}

/** tuning.ts either reads package.json's version or hard-codes the same string. */
export function assertVersionSource(tuning, version) {
  const hardcodedVersion = tuning.match(/export const VERSION(?:: string)? = '([^']+)'/);
  const readsPackage =
    /import \{ version \} from '\.\.\/\.\.\/package\.json';/.test(tuning) && /export const VERSION(?:: string)? = version;/.test(tuning);
  if (hardcodedVersion?.[1] !== version && !readsPackage) {
    throw new Error(`src/meta/tuning.ts VERSION must match package.json version ${version}.`);
  }
}

function prepareRelease() {
  assertNoReleasePlaceholders();
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  if (dirty.trim()) throw new Error('Release requires a clean working tree. Commit or set aside all changes first.');
  if (process.env.VITE_TESTER === '1') throw new Error('VITE_TESTER must be off for a release.');

  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('package.json needs a semantic release version.');
  assertVersionSource(readFileSync('src/meta/tuning.ts', 'utf8'), version);

  run('npm', ['ci']);
  run('npm', ['run', 'build']);
  run('npx', ['cap', 'sync', 'ios']);

  const forbidden = /__app|__i18n|__scene|__gate|Balance Report|VITE_TESTER/;
  const publicDir = 'ios/App/App/public';
  const hits = walk(publicDir).filter((path) => forbidden.test(readFileSync(path, 'utf8')));
  if (hits.length) throw new Error(`Tester or developer hooks in native bundle: ${hits.join(', ')}`);

  const projectPath = 'ios/App/App.xcodeproj/project.pbxproj';
  let project = readFileSync(projectPath, 'utf8');
  const builds = [...project.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) => Number(m[1]));
  if (builds.length !== 2 || builds[0] !== builds[1]) throw new Error('Expected matching Debug and Release build numbers.');
  const nextBuild = builds[0] + 1;
  project = project.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuild};`);
  const marketing = [...project.matchAll(/MARKETING_VERSION = [^;]+;/g)];
  if (marketing.length !== 2) throw new Error('Expected Debug and Release marketing versions.');
  project = project.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
  writeFileSync(projectPath, project);

  console.log(`Prepared Comet Garden ${version} (${nextBuild}). Review and commit the build-number change before archiving.`);
  console.log('Archive command:');
  console.log(
    'xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination "generic/platform=iOS" -archivePath build/CometGarden.xcarchive archive',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) prepareRelease();

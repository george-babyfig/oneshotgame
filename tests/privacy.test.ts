// Privacy lint (ROADMAP-v2 7.1, M1 item 1.4). The App Store label stays "Data Not Collected":
// no network code, no hard-coded endpoints, no new runtime dependencies without a conscious change
// here, no remote `server.url`, and an unchanged privacy manifest.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ---- Allowlists (changing any of these is a privacy decision: say why in the commit) ----

/** Every runtime dependency in package.json. A new one is a new SDK in the app binary. */
export const ALLOWED_DEPENDENCIES = [
  '@capacitor-community/in-app-review',
  '@capacitor/app',
  '@capacitor/core',
  '@capacitor/filesystem',
  '@capacitor/haptics',
  '@capacitor/ios',
  '@capacitor/local-notifications',
  '@capacitor/preferences',
  '@capacitor/share',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
  '@capgo/native-purchases',
  '@fontsource/fredoka',
];

/** Hard-coded URLs allowed in code (comments are ignored). XML namespaces are identifiers, never fetched. */
export const ALLOWED_URLS = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  // The "Rate Comet Garden" link: opened by the system only after the parental gate, and only once the
  // owner sets APP_STORE_ID (settings.ts). It is a link out, never fetched by the app.
  'https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review',
];

/** Network APIs banned in src/ (matched in code, not comments). */
export const NETWORK_APIS: { label: string; re: RegExp }[] = [
  { label: 'fetch(', re: /(?<![\w$.])fetch\s*\(|\.fetch\s*\(/ },
  { label: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { label: 'sendBeacon', re: /\bsendBeacon\b/ },
  { label: 'WebSocket', re: /\bWebSocket\b/ },
  { label: 'EventSource', re: /\bEventSource\b/ },
  { label: 'RTCPeerConnection', re: /\bRTCPeerConnection\b/ },
  { label: 'CapacitorHttp', re: /\bCapacitorHttp\b/ },
  { label: 'downloadFile', re: /\b(?:Filesystem\s*\.\s*)?downloadFile\s*\(/ },
];

/** Privacy review 2026-10-05: Filesystem uses only app-local postcard timestamps (C617.1); Preferences uses app settings (CA92.1). No collected data or tracking. */
export const PRIVACY_MANIFEST_SHA256 = 'c7698b0790c3bcf9ba6786caf8a7819579d05d573ec60f466f0c03d9b5f2811a';
const PRIVACY_MANIFEST = 'ios/App/App/PrivacyInfo.xcprivacy';

// ---- Helpers ----

function walk(dir: string, extensions = ['.ts']): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, extensions) : extensions.some((ext) => p.endsWith(ext)) ? [p] : [];
  });
}

const rel = (p: string) => relative(process.cwd(), p).split(sep).join('/');

/** Source with block and line comments removed. A `//` right after `:` (a URL scheme) is kept. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

const SRC = walk('src').map((f) => ({ file: rel(f), src: code(f) }));

function bareImports(src: string): string[] {
  const imports = [/\bimport\s+(?:type\s+)?(?:[\w*{},\s]+?\s+from\s*)?['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g];
  return imports.flatMap((re) => [...src.matchAll(re)].map((m) => m[1])).filter((specifier) => !specifier.startsWith('.'));
}

function lineOf(src: string, index: number) {
  return src.slice(0, index).split('\n').length;
}

// ---- Rules ----

describe('privacy: no network code in src/', () => {
  it('scans a sensible number of files', () => {
    expect(SRC.length).toBeGreaterThan(40);
  });

  it('uses no network API (fetch, XHR, beacons, sockets, event streams, native HTTP)', () => {
    const bad: string[] = [];
    for (const { file, src } of SRC) {
      for (const api of NETWORK_APIS) {
        const m = api.re.exec(src);
        if (m) bad.push(`${file}:${lineOf(src, m.index)}: ${api.label}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('has no hard-coded http(s) URL outside the allowlist', () => {
    const bad: string[] = [];
    for (const { file, src } of SRC) {
      for (const m of src.matchAll(/https?:\/\/[^\s'"`)<>]+/g)) {
        if (!ALLOWED_URLS.includes(m[0])) bad.push(`${file}:${lineOf(src, m.index!)}: ${m[0]}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('CSS, index.html and public assets have no remote URLs or imports', () => {
    const files = [...walk('src', ['.css']), 'index.html', ...walk('public', [''])];
    const bad: string[] = [];
    for (const path of files) {
      const src = readFileSync(path, 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of src.matchAll(/https?:\/\/[^\s'"`)<>]+|\burl\s*\(\s*['"]?https?:|@import\b/gi)) {
        if (!ALLOWED_URLS.includes(m[0])) bad.push(`${rel(path)}:${lineOf(src, m.index!)}: ${m[0]}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('privacy: dependency allowlist', () => {
  it('recognizes static, side-effect and dynamic bare imports', () => {
    expect(bareImports("import x from 'vite'; import '@capacitor/core'; await import('vitest'); import './local';")).toEqual([
      'vite',
      '@capacitor/core',
      'vitest',
    ]);
  });

  it('src imports only relative modules or allowed runtime dependencies', () => {
    const bad = SRC.flatMap(({ file, src }) =>
      bareImports(src)
        .filter((specifier) => !ALLOWED_DEPENDENCIES.some((dep) => specifier === dep || specifier.startsWith(`${dep}/`)))
        .map((specifier) => `${file}: ${specifier}`),
    );
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('package.json "dependencies" is exactly the allowlist', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {}).sort();
    const added = deps.filter((d) => !ALLOWED_DEPENDENCIES.includes(d));
    const removed = ALLOWED_DEPENDENCIES.filter((d) => !deps.includes(d));
    expect(added, `new runtime dependencies (add them to ALLOWED_DEPENDENCIES only after a privacy review): ${added}`).toEqual([]);
    expect(removed, `removed dependencies (drop them from ALLOWED_DEPENDENCIES too): ${removed}`).toEqual([]);
  });
});

describe('privacy: Capacitor loads the bundled app, never a remote server', () => {
  const configs = ['capacitor.config.ts', 'capacitor.config.json', 'capacitor.config.js', 'ios/App/App/capacitor.config.json'].filter(
    existsSync,
  );

  it('finds capacitor.config.ts', () => {
    expect(configs).toContain('capacitor.config.ts');
  });

  it('no config sets server.url', () => {
    const bad: string[] = [];
    for (const f of configs) {
      const src = readFileSync(f, 'utf8');
      if (/\bserver\s*["']?\s*:\s*\{[\s\S]*?\burl\b/.test(src) || /server\.url/.test(src)) bad.push(`${f}: server.url`);
      if (f.endsWith('.json')) {
        const cfg = JSON.parse(src) as { server?: { url?: string } };
        if (cfg.server?.url) bad.push(`${f}: server.url = ${cfg.server.url}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('privacy: the privacy manifest', () => {
  it('exists at ios/App/App/PrivacyInfo.xcprivacy', () => {
    expect(existsSync(PRIVACY_MANIFEST)).toBe(true);
  });

  it('declares no tracking, no tracking domains and no collected data', () => {
    const xml = readFileSync(PRIVACY_MANIFEST, 'utf8');
    expect(xml).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
    expect(xml).toMatch(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
  });

  it('is unchanged (hash matches the committed value)', () => {
    const xml = readFileSync(PRIVACY_MANIFEST, 'utf8').replace(/\r\n/g, '\n');
    const hash = createHash('sha256').update(xml).digest('hex');
    expect(hash, 'PrivacyInfo.xcprivacy changed: review it, then update PRIVACY_MANIFEST_SHA256').toBe(PRIVACY_MANIFEST_SHA256);
  });
});

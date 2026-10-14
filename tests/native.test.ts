import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { detectLang } from '../src/i18n';

const read = (path: string) => readFileSync(path, 'utf8');
const app = 'ios/App/App';
const project = read('ios/App/App.xcodeproj/project.pbxproj');
const info = read(`${app}/Info.plist`);
const privacy = read(`${app}/PrivacyInfo.xcprivacy`);
const locales = ['en', 'es', 'fr', 'de', 'pt-BR', 'ja'];

function plistString(xml: string, key: string) {
  return xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`))?.[1];
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('native iOS release configuration', () => {
  it('has a localized add-only Photos description in every shipping language', () => {
    expect(plistString(info, 'NSPhotoLibraryAddUsageDescription')).toBe('Saves your Comet Garden picture to Photos.');
    const declared = info.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1];
    expect(declared).toBeTruthy();
    for (const locale of locales) {
      expect(declared).toContain(`<string>${locale}</string>`);
      expect(project).toContain(`${locale === 'pt-BR' ? '"pt-BR"' : locale},`);
      expect(read(`${app}/${locale}.lproj/InfoPlist.strings`)).toMatch(/"NSPhotoLibraryAddUsageDescription" = "[^"\n]+";/);
    }
    expect(project).toContain('InfoPlist.strings in Resources');
  });

  it('declares only the linked plugins’ required-reason APIs', () => {
    const entries = [
      ...privacy.matchAll(
        /<dict>\s*<key>NSPrivacyAccessedAPIType<\/key>\s*<string>([^<]+)<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>([^<]+)<\/string>/g,
      ),
    ].map((m) => [m[1], m[2]]);
    expect(entries).toEqual([
      ['NSPrivacyAccessedAPICategoryFileTimestamp', 'C617.1'],
      ['NSPrivacyAccessedAPICategoryUserDefaults', 'CA92.1'],
    ]);
  });

  it('uses iOS 15.4 in every app and project configuration', () => {
    expect([...project.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);/g)].map((m) => m[1])).toEqual(Array(4).fill('15.4'));
    expect(read('vite.config.ts')).toContain("target: ['es2020', 'safari15.4']");
  });

  it('rejects JavaScript APIs newer than Safari 15.4 in app source', () => {
    // Object.hasOwn, structuredClone, at, and findLast are available at the chosen floor.
    const newer =
      /\.(?:toSorted|toReversed|toSpliced|with|union|intersection|difference|symmetricDifference)\s*\(|\b(?:Object\.groupBy|Map\.groupBy|Array\.fromAsync|Promise\.withResolvers)\s*\(/;
    const hits = sourceFiles('src').flatMap((path) => {
      const code = read(path)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      return newer.test(code) ? [path] : [];
    });
    expect(hits).toEqual([]);
  });

  it('has an opaque RGB 1024px marketing icon', () => {
    const png = readFileSync(`${app}/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
    expect(png[25]).toBe(2); // PNG truecolor, no alpha channel.
  });

  it('starts the registered Game Center bridge and sends the app language to the web view', () => {
    expect(read(`${app}/SceneDelegate.swift`)).toContain('rootViewController = MainViewController()');
    expect(read(`${app}/Base.lproj/Main.storyboard`)).toContain('customClass="MainViewController"');
    const controller = read(`${app}/MainViewController.swift`);
    expect(controller).toContain('registerPluginInstance(GameCenterPlugin())');
    expect(controller).toContain('window.__nativeLanguage');
    expect(read('src/i18n.ts')).toContain('window.__nativeLanguage');
  });

  it('uses the iOS language hint before WKWebView navigator.language', () => {
    vi.stubGlobal('window', { __nativeLanguage: 'ja-JP' });
    vi.stubGlobal('navigator', { language: 'en-US' });
    try {
      expect(detectLang()).toBe('ja');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps package version and both Xcode marketing versions aligned', () => {
    const version = JSON.parse(read('package.json')).version;
    expect([...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1])).toEqual([version, version]);
    const tuning = read('src/meta/tuning.ts');
    // tuning.ts reads the version straight from package.json, so there is nothing to keep in sync by hand.
    expect(tuning).toMatch(/import \{ version \} from '\.\.\/\.\.\/package\.json'/);
    expect(tuning).toContain('export const VERSION: string = version;');
  });

  it('registers an early persistent StoreKit journal and consumable-history fallback', () => {
    const plugin = read(`${app}/PurchaseJournalPlugin.swift`);
    expect(plugin).toContain('Transaction.unfinished');
    expect(plugin).toContain('Transaction.updates');
    expect(plugin).toContain('UserDefaults.standard.set(data');
    expect(plugin).toContain('name: "drain"');
    expect(plugin).toContain('name: "ack"');
    expect(read('ios/App/CapApp-SPM/Package.swift')).not.toContain('CapgoNativePurchases');
    expect(read('capacitor.config.ts')).toContain('includePlugins: [');
    expect(read(`${app}/MainViewController.swift`)).toContain('registerPluginInstance(PurchaseJournalPlugin())');
    expect(read(`${app}/AppDelegate.swift`)).toContain('PurchaseJournal.shared.start()');
    expect(project).toContain('PurchaseJournalPlugin.swift in Sources');
    expect(info).toMatch(/<key>SKIncludeConsumableInAppPurchaseHistory<\/key>\s*<true\/>/);
  });
});

describe('A12 dormant iCloud backup bridge', () => {
  it('registers the local plugin in the bridge, project group and Sources phase', () => {
    expect(read(`${app}/MainViewController.swift`)).toContain('registerPluginInstance(CloudBackupPlugin())');
    expect(project).toContain('path = CloudBackupPlugin.swift;');
    expect(project.match(/CloudBackupPlugin.swift in Sources/g)).toHaveLength(2);
    expect(read(`${app}/CloudBackupPlugin.swift`)).toContain('public let jsName = "CloudBackup"');
  });
  it('ships the explicit flag false with no iCloud entitlement or capability', () => {
    expect(info).toMatch(/<key>PPCloudBackup<\/key>\s*<false\/>/);
    expect(read(`${app}/App.entitlements`)).not.toMatch(/ubiquity|icloud/i);
    expect(project).not.toContain('com.apple.iCloud');
    expect([...project.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)].map((m) => m[1])).toEqual(['1', '1']);
  });
  it('checks flag/account before obtaining the store, compresses with zlib and handles change notifications', () => {
    const swift = read(`${app}/CloudBackupPlugin.swift`);
    const store = swift.slice(swift.indexOf('private func store()'), swift.indexOf('private func parts('));
    expect(store.indexOf('guard enabled, account')).toBeLessThan(store.indexOf('NSUbiquitousKeyValueStore.default'));
    const status = swift.slice(swift.indexOf('@objc func status'), swift.indexOf('@objc func list'));
    expect(status).not.toMatch(/store\(|synchronize/);
    expect(swift).toContain('compressed(using: .zlib)');
    expect(swift).toContain('decompressed(using: .zlib)');
    expect(swift).toContain('didChangeExternallyNotification');
    for (const reason of ['server', 'initial', 'quota', 'account']) expect(swift).toContain(`"${reason}"`);
    expect(swift).toContain('bound == nonce');
    expect(swift).toContain('kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly');
    expect(swift).toContain('NSKeyedArchiver.archivedData');
    expect(swift).toContain('"accountChanged": !self.authorized()');
    expect(swift).toContain('guard enabled, account, authorized()');
    expect(swift).toContain('guard self.enabled, self.account, self.authorized()');
    expect(swift).toContain('backups.count < 6');
    expect(swift).toContain('900 * 1024');
    expect(swift).toContain('96 * 1024');
  });
});

describe('M14 custom Road link', () => {
  it('registers the custom scheme and preserves scene URL forwarding without associated domains', () => {
    expect(info).toMatch(
      /<key>CFBundleURLTypes<\/key>\s*<array>[\s\S]*?<key>CFBundleURLSchemes<\/key>\s*<array><string>cometgarden<\/string><\/array>/,
    );
    const scene = read(`${app}/SceneDelegate.swift`);
    expect(scene).toContain('SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)');
    expect(scene).toContain('SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)');
    expect(read(`${app}/App.entitlements`)).not.toContain('associated-domains');
    expect(read('src/main.ts')).toContain('installDeepLinks(app, readyForLinks)');
  });
  it('accepts only the internal Road route', async () => {
    const { isRoadLink } = await import('../src/ui/deeplink');
    expect(isRoadLink('cometgarden://road')).toBe(true);
    expect(isRoadLink('cometgarden://road/')).toBe(true);
    for (const url of [
      'https://road',
      'cometgarden://shop',
      'cometgarden://road/buy',
      'cometgarden://road?buy=1',
      'cometgarden://road#shop',
      'cometgarden://adult@road',
      'cometgarden://road:80',
      'bad',
    ])
      expect(isRoadLink(url)).toBe(false);
  });
  it('keeps session 1, tutorials, rounds and gates intact; locked players go Home', async () => {
    const { defaultProfile } = await import('../src/meta/profile');
    const { routeRoadLink } = await import('../src/ui/deeplink');
    const p = defaultProfile(0);
    const linked = { p, screen: 'home', showHome: vi.fn(), showRoad: vi.fn() };
    p.level = 45;
    p.meta.sessions = 1;
    p.tutorial = true;
    expect(routeRoadLink(linked, 'cometgarden://road', false)).toBe(false);
    p.meta.sessions = 2;
    p.tutorial = false;
    expect(routeRoadLink(linked, 'cometgarden://road', false)).toBe(false);
    p.tutorial = true;
    linked.screen = 'level';
    expect(routeRoadLink(linked, 'cometgarden://road', false)).toBe(false);
    linked.screen = 'home';
    expect(routeRoadLink(linked, 'cometgarden://road', true)).toBe(false);
    expect(linked.showRoad).not.toHaveBeenCalled();
    const before = JSON.stringify(p);
    expect(routeRoadLink(linked, 'cometgarden://road', false)).toBe(true);
    expect(linked.showRoad).toHaveBeenCalledOnce();
    expect(JSON.stringify(p)).toBe(before);
    p.level = 21;
    expect(routeRoadLink(linked, 'cometgarden://road', false)).toBe(true);
    expect(linked.showHome).toHaveBeenCalledWith(true);
  });
  it('holds cold/warm delivery until init completes and removes only its own listener', async () => {
    const { defaultProfile } = await import('../src/meta/profile');
    const { installDeepLinks } = await import('../src/ui/deeplink');
    const p = defaultProfile(0);
    p.level = 45;
    p.tutorial = true;
    p.meta.sessions = 2;
    const linked = { p, screen: 'home', showHome: vi.fn(), showRoad: vi.fn() };
    let resolve!: (ok: boolean) => void;
    const ready = new Promise<boolean>((done) => {
      resolve = done;
    });
    let receive!: (data: { url: string }) => void;
    const remove = vi.fn(async () => {});
    const native = {
      addListener: vi.fn(async (_: 'appUrlOpen', callback: typeof receive) => {
        receive = callback;
        return { remove };
      }),
      getLaunchUrl: vi.fn(async () => ({ url: 'cometgarden://road' })),
    };
    const dispose = installDeepLinks(linked, ready, native, () => false);
    receive({ url: 'cometgarden://road' }); // retained cold appUrlOpen
    expect(linked.showRoad).not.toHaveBeenCalled();
    resolve(true);
    await vi.waitFor(() => expect(linked.showRoad).toHaveBeenCalledOnce());
    receive({ url: 'cometgarden://road' });
    await vi.waitFor(() => expect(linked.showRoad).toHaveBeenCalledTimes(2));
    dispose();
    expect(remove).toHaveBeenCalledOnce();
    receive({ url: 'cometgarden://road' });
    await Promise.resolve();
    expect(linked.showRoad).toHaveBeenCalledTimes(2);
    expect(native.getLaunchUrl).not.toHaveBeenCalled();
  });
  it('uses retained cold delivery once and refuses recovery delivery', async () => {
    const { defaultProfile } = await import('../src/meta/profile');
    const { installDeepLinks } = await import('../src/ui/deeplink');
    const p = defaultProfile(0);
    p.level = 45;
    p.tutorial = true;
    p.meta.sessions = 2;
    const linked = { p, screen: 'home', showHome: vi.fn(), showRoad: vi.fn() };
    const native = {
      addListener: vi.fn(async (_: 'appUrlOpen', callback: (data: { url: string }) => void) => {
        callback({ url: 'cometgarden://road' });
        return { remove: async () => {} };
      }),
      getLaunchUrl: vi.fn(async () => ({ url: 'cometgarden://road' })),
    };
    installDeepLinks(linked, Promise.resolve(true), native, () => false);
    await vi.waitFor(() => expect(linked.showRoad).toHaveBeenCalledOnce());
    expect(native.getLaunchUrl).not.toHaveBeenCalled();
    linked.showRoad.mockClear();
    installDeepLinks(linked, Promise.resolve(false), native, () => false);
    await Promise.resolve();
    await Promise.resolve();
    expect(linked.showRoad).not.toHaveBeenCalled();
  });
  it('checks M14 release metadata against major.minor before the release CLI mutates anything', async () => {
    // @ts-expect-error Plain JS helper has no declaration file.
    const { assertReleaseVersion } = await import('../scripts/ios-release.mjs');
    expect(() => assertReleaseVersion("{version: '1.2'}", '1.2.0')).not.toThrow();
    expect(() => assertReleaseVersion("{version: '1.2'}", '1.2.7')).not.toThrow();
    expect(() => assertReleaseVersion("{version: '1.2'}", '1.0.0')).toThrow('must match');
    const cli = read('scripts/ios-release.mjs');
    expect(cli.indexOf('assertReleaseVersion(readFileSync')).toBeLessThan(cli.indexOf("run('npm', ['ci'])"));
    expect(cli).toContain("RELEASE_CHECK: '1'");
    expect(cli).toContain('RUNWAY_FROM: new Date().toISOString().slice(0, 10)');
  });
});

it.each(['cold', 'warm'] as const)('queues %s Road links through every Home popup, then routes once', async (launch) => {
  const { defaultProfile } = await import('../src/meta/profile');
  const { installDeepLinks } = await import('../src/ui/deeplink');
  const p = defaultProfile(0);
  p.level = 45;
  p.tutorial = true;
  p.meta.sessions = 3;
  const linked = { p, screen: 'home', linkBusy: false, showHome: vi.fn(), showRoad: vi.fn() };
  let receive!: (data: { url: string }) => void;
  let changed!: () => void;
  let blocked = true;
  let homePopup = true;
  const disconnect = vi.fn();
  vi.stubGlobal('document', { body: {} });
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        changed = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  const native = {
    addListener: vi.fn(async (_event: 'appUrlOpen', callback: typeof receive) => {
      receive = callback;
      return { remove: vi.fn(async () => {}) };
    }),
    getLaunchUrl: vi.fn(async () => ({ url: 'cometgarden://road' })),
  };
  let resolve!: (ok: boolean) => void;
  const ready =
    launch === 'cold'
      ? new Promise<boolean>((done) => {
          resolve = done;
        })
      : Promise.resolve(true);
  const dispose = installDeepLinks(
    linked,
    ready,
    native,
    () => blocked,
    () => homePopup,
  );
  try {
    receive({ url: 'cometgarden://road' });
    if (launch === 'cold') {
      await Promise.resolve();
      expect(linked.showRoad).not.toHaveBeenCalled();
      resolve(true);
    }
    await Promise.resolve();
    expect(linked.showRoad).not.toHaveBeenCalled();
    changed(); // Away closes but another Home card is still open.
    expect(linked.showRoad).not.toHaveBeenCalled();
    receive({ url: 'cometgarden://road/' }); // Coalesce duplicate pending delivery.
    await Promise.resolve();
    blocked = homePopup = false;
    changed();
    changed();
    expect(linked.showRoad).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(native.getLaunchUrl).not.toHaveBeenCalled();

    // An open gate or purchase must not become queued navigation, nor can busy purchase work route.
    blocked = true;
    receive({ url: 'cometgarden://road' });
    await Promise.resolve();
    blocked = false;
    changed();
    linked.linkBusy = true;
    receive({ url: 'cometgarden://road' });
    await Promise.resolve();
    linked.linkBusy = false;
    changed();
    expect(linked.showRoad).toHaveBeenCalledOnce();
  } finally {
    dispose();
    vi.unstubAllGlobals();
  }
});

it('a WebView reload with only a stale launch URL never routes; a new retained event still works', async () => {
  const { defaultProfile } = await import('../src/meta/profile');
  const { installDeepLinks } = await import('../src/ui/deeplink');
  const p = defaultProfile(0);
  p.level = 45;
  p.tutorial = true;
  p.meta.sessions = 4;
  const linked = { p, screen: 'home', showHome: vi.fn(), showRoad: vi.fn() };
  let receive!: (data: { url: string }) => void;
  const native = {
    addListener: vi.fn(async (_event: 'appUrlOpen', callback: typeof receive) => {
      receive = callback;
      return { remove: vi.fn(async () => {}) };
    }),
    getLaunchUrl: vi.fn(async () => ({ url: 'cometgarden://road' })),
  };
  const firstBoot = installDeepLinks(linked, Promise.resolve(true), native, () => false);
  receive({ url: 'cometgarden://road' });
  await Promise.resolve();
  expect(linked.showRoad).toHaveBeenCalledOnce();
  firstBoot();
  linked.showRoad.mockClear();
  const reload = installDeepLinks(linked, Promise.resolve(true), native, () => false);
  await Promise.resolve();
  await Promise.resolve();
  expect(native.getLaunchUrl).not.toHaveBeenCalled();
  expect(linked.showRoad).not.toHaveBeenCalled();
  for (const url of ['bad', 'cometgarden://road?buy=1', 'cometgarden://shop']) receive({ url });
  await Promise.resolve();
  expect(linked.showRoad).not.toHaveBeenCalled();
  receive({ url: 'cometgarden://road/' });
  await Promise.resolve();
  expect(linked.showRoad).toHaveBeenCalledOnce();
  reload();
});

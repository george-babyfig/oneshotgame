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

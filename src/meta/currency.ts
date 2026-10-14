const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  JP: 'JPY',
  BR: 'BRL',
  CH: 'CHF',
  MX: 'MXN',
  IN: 'INR',
  CN: 'CNY',
  KR: 'KRW',
  TW: 'TWD',
  HK: 'HKD',
  SG: 'SGD',
  TH: 'THB',
  TR: 'TRY',
  ZA: 'ZAR',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  AT: 'EUR',
  BE: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
};

export function deviceCurrency(locale: string): string {
  try {
    const language = new Intl.Locale(locale);
    const region = language.region ?? language.maximize().region;
    return (region && REGION_CURRENCY[region]) || 'USD';
  } catch {
    return 'USD';
  }
}

export function formatCurrency(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }
}

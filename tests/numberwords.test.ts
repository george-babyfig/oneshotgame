import { describe, expect, it } from 'vitest';
import { numberToWords, type NumberWordLang } from '../src/i18n/numberWords';

const numbers = [100, 101, 110, 111, 115, 120, 171, 199, 200, 201, 380, 471, 499, 500, 777, 999];
const expected: Record<NumberWordLang, string[]> = {
  en: [
    'one hundred',
    'one hundred one',
    'one hundred ten',
    'one hundred eleven',
    'one hundred fifteen',
    'one hundred twenty',
    'one hundred seventy-one',
    'one hundred ninety-nine',
    'two hundred',
    'two hundred one',
    'three hundred eighty',
    'four hundred seventy-one',
    'four hundred ninety-nine',
    'five hundred',
    'seven hundred seventy-seven',
    'nine hundred ninety-nine',
  ],
  es: [
    'cien',
    'ciento uno',
    'ciento diez',
    'ciento once',
    'ciento quince',
    'ciento veinte',
    'ciento setenta y uno',
    'ciento noventa y nueve',
    'doscientos',
    'doscientos uno',
    'trescientos ochenta',
    'cuatrocientos setenta y uno',
    'cuatrocientos noventa y nueve',
    'quinientos',
    'setecientos setenta y siete',
    'novecientos noventa y nueve',
  ],
  fr: [
    'cent',
    'cent un',
    'cent dix',
    'cent onze',
    'cent quinze',
    'cent vingt',
    'cent soixante et onze',
    'cent quatre-vingt-dix-neuf',
    'deux cents',
    'deux cent un',
    'trois cent quatre-vingts',
    'quatre cent soixante et onze',
    'quatre cent quatre-vingt-dix-neuf',
    'cinq cents',
    'sept cent soixante-dix-sept',
    'neuf cent quatre-vingt-dix-neuf',
  ],
  de: [
    'einhundert',
    'einhunderteins',
    'einhundertzehn',
    'einhundertelf',
    'einhundertfünfzehn',
    'einhundertzwanzig',
    'einhunderteinundsiebzig',
    'einhundertneunundneunzig',
    'zweihundert',
    'zweihunderteins',
    'dreihundertachtzig',
    'vierhunderteinundsiebzig',
    'vierhundertneunundneunzig',
    'fünfhundert',
    'siebenhundertsiebenundsiebzig',
    'neunhundertneunundneunzig',
  ],
  pt: [
    'cem',
    'cento e um',
    'cento e dez',
    'cento e onze',
    'cento e quinze',
    'cento e vinte',
    'cento e setenta e um',
    'cento e noventa e nove',
    'duzentos',
    'duzentos e um',
    'trezentos e oitenta',
    'quatrocentos e setenta e um',
    'quatrocentos e noventa e nove',
    'quinhentos',
    'setecentos e setenta e sete',
    'novecentos e noventa e nove',
  ],
  ja: [
    'ひゃく',
    'ひゃくいち',
    'ひゃくじゅう',
    'ひゃくじゅういち',
    'ひゃくじゅうご',
    'ひゃくにじゅう',
    'ひゃくななじゅういち',
    'ひゃくきゅうじゅうきゅう',
    'にひゃく',
    'にひゃくいち',
    'さんびゃくはちじゅう',
    'よんひゃくななじゅういち',
    'よんひゃくきゅうじゅうきゅう',
    'ごひゃく',
    'ななひゃくななじゅうなな',
    'きゅうひゃくきゅうじゅうきゅう',
  ],
};

describe('three-digit number words', () => {
  for (const lang of Object.keys(expected) as NumberWordLang[]) {
    it.each(numbers)(lang + ' %i', (n) => {
      expect(numberToWords(n, lang)).toBe(expected[lang][numbers.indexOf(n)]);
    });
  }
  it('handles irregular hundreds and accented forms', () => {
    expect(numberToWords(616, 'ja')).toBe('ろっぴゃくじゅうろく');
    expect(numberToWords(888, 'ja')).toBe('はっぴゃくはちじゅうはち');
    expect(numberToWords(322, 'es')).toBe('trescientos veintidós');
    expect(numberToWords(281, 'fr')).toBe('deux cent quatre-vingt-un');
  });
  it.each([99, 100.5, 1000, NaN])('rejects %s', (n) => {
    expect(() => numberToWords(n, 'en')).toThrow(RangeError);
  });
});

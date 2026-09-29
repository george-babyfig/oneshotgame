export type NumberWordLang = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';

const EN =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(
    ' ',
  );
const EN_TENS = 'twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
const ES =
  'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve'.split(
    ' ',
  );
const ES_TENS = 'treinta cuarenta cincuenta sesenta setenta ochenta noventa'.split(' ');
const ES_HUNDREDS = 'ciento doscientos trescientos cuatrocientos quinientos seiscientos setecientos ochocientos novecientos'.split(' ');
const FR = 'zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize'
  .split(' ')
  .concat(['dix-sept', 'dix-huit', 'dix-neuf']);
const FR_TENS = 'vingt trente quarante cinquante soixante'.split(' ');
const DE =
  'null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn'.split(
    ' ',
  );
const DE_TENS = 'zwanzig dreißig vierzig fünfzig sechzig siebzig achtzig neunzig'.split(' ');
const PT = 'zero um dois três quatro cinco seis sete oito nove'.split(' ');
const PT_TEENS = 'dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove'.split(' ');
const PT_TENS = 'vinte trinta quarenta cinquenta sessenta setenta oitenta noventa'.split(' ');
const PT_HUNDREDS = 'cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos'.split(' ');
const JA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

function english(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const tail = r < 20 ? EN[r] : EN_TENS[Math.floor(r / 10) - 2] + (r % 10 ? '-' + EN[r % 10] : '');
  return EN[h] + ' hundred' + (r ? ' ' + tail : '');
}

function spanish(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const r = n % 100;
  const tail = r < 30 ? ES[r] : ES_TENS[Math.floor(r / 10) - 3] + (r % 10 ? ' y ' + ES[r % 10] : '');
  return ES_HUNDREDS[h - 1] + (r ? ' ' + tail : '');
}

function frenchBelow100(n: number): string {
  if (n < 20) return FR[n];
  if (n < 70) {
    const tens = FR_TENS[Math.floor(n / 10) - 2];
    const unit = n % 10;
    return tens + (unit === 1 ? ' et un' : unit ? '-' + FR[unit] : '');
  }
  if (n < 80) return 'soixante' + (n === 71 ? ' et onze' : '-' + FR[n - 60]);
  const r = n - 80;
  return 'quatre-vingt' + (r === 0 ? 's' : '-' + FR[r]);
}

function french(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = (h === 1 ? '' : FR[h] + ' ') + 'cent' + (h > 1 && r === 0 ? 's' : '');
  return head + (r ? ' ' + frenchBelow100(r) : '');
}

function german(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (r === 0) return (h === 1 ? 'ein' : DE[h]) + 'hundert';
  const tail = r < 20 ? DE[r] : (r % 10 ? (r % 10 === 1 ? 'ein' : DE[r % 10]) + 'und' : '') + DE_TENS[Math.floor(r / 10) - 2];
  return (h === 1 ? 'ein' : DE[h]) + 'hundert' + tail;
}

function portuguese(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (n === 100) return 'cem';
  const head = PT_HUNDREDS[h - 1];
  if (!r) return head;
  const tail = r < 10 ? PT[r] : r < 20 ? PT_TEENS[r - 10] : PT_TENS[Math.floor(r / 10) - 2] + (r % 10 ? ' e ' + PT[r % 10] : '');
  return head + ' e ' + tail;
}

function japanese(n: number): string {
  const h = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  const hundreds = h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : (h === 1 ? '' : JA[h]) + 'ひゃく';
  return hundreds + (tens ? (tens === 1 ? '' : JA[tens]) + 'じゅう' : '') + (ones ? JA[ones] : '');
}

/** Spell a gate number without relying on platform speech or translation tables. */
export function numberToWords(n: number, lang: NumberWordLang): string {
  if (!Number.isInteger(n) || n < 100 || n > 999) throw new RangeError('Expected an integer from 100 to 999');
  switch (lang) {
    case 'en':
      return english(n);
    case 'es':
      return spanish(n);
    case 'fr':
      return french(n);
    case 'de':
      return german(n);
    case 'pt':
      return portuguese(n);
    case 'ja':
      return japanese(n);
  }
}

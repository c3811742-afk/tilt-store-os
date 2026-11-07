// EAN-13: 12 digits plus a check digit. Used for items that arrive without a barcode.
export const ean13CheckDigit = (twelveDigits: string) => {
  const sum = [...twelveDigits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
};

export const makeEan13 = (prefix: string, sequence: number) => {
  const body = `${prefix}${String(sequence).padStart(12 - prefix.length, '0')}`.slice(0, 12);
  return body + ean13CheckDigit(body);
};

// The bars of an EAN-13 as a string of 1s (black) and 0s (white), for drawing labels.
const codes = {
  L: ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'],
  G: ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'],
  R: ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'],
};
const parity = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export const ean13Bars = (code: string) => {
  if (!/^\d{13}$/.test(code)) return '';
  const digits = [...code].map(Number);
  const pattern = parity[digits[0]];
  const left = digits.slice(1, 7).map((digit, index) => codes[pattern[index] as 'L' | 'G'][digit]).join('');
  const right = digits.slice(7).map((digit) => codes.R[digit]).join('');
  return `101${left}01010${right}101`;
};

// Code 128 (set B): letters, digits and signs, for receipt numbers like S-000124. Same 1s and 0s format.
const code128Patterns = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100', '1100011101011',
];

export const code128Bars = (value: string) => {
  const codes = [...value].map((character) => character.charCodeAt(0) - 32);
  if (!codes.length || codes.some((code) => code < 0 || code > 94)) return '';
  const startB = 104;
  const checksum = codes.reduce((sum, code, index) => sum + code * (index + 1), startB) % 103;
  return [startB, ...codes, checksum].map((code) => code128Patterns[code]).join('') + code128Patterns[106];
};

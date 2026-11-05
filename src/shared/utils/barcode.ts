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

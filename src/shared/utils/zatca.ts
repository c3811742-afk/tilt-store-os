// The QR code on Saudi simplified tax invoices (ZATCA): seller name, VAT number, time, total and VAT,
// each as tag, length and UTF-8 value, then Base64.
export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  at: string; // ISO date and time
  total: number; // VAT included
  vat: number;
}

export const zatcaQrPayload = ({ sellerName, vatNumber, at, total, vat }: ZatcaQrInput) => {
  const encoder = new TextEncoder();
  const fields = [sellerName, vatNumber, at, total.toFixed(2), vat.toFixed(2)];
  const bytes = fields.flatMap((value, index) => {
    const encoded = [...encoder.encode(value)];
    return [index + 1, encoded.length, ...encoded];
  });
  return btoa(String.fromCharCode(...bytes));
};

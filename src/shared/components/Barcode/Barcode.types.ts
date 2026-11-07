export interface BarcodeProps {
  value?: string; // printed under the bars
  format?: 'code128' | 'ean13'; // code128 for receipt numbers, ean13 for product barcodes
  height?: string;
  maxWidth?: string;
  showValue?: boolean;
}

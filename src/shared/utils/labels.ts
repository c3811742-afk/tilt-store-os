import { ean13Bars } from './barcode';

export interface LabelInput {
  title: string; // the product name
  detail: string; // size and colour
  price: string; // already formatted
  barcode: string;
  copies: number;
}

const barWidth = 2; // in the SVG's own units
const barHeight = 60;

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const barcodeSvg = (code: string) => {
  const bars = ean13Bars(code);
  if (!bars) return `<p>${escape(code)}</p>`;
  const rects = [...bars].map((bit, index) => (bit === '1' ? `<rect x="${index * barWidth}" y="0" width="${barWidth}" height="${barHeight}"/>` : '')).join('');
  return `<svg viewBox="0 0 ${bars.length * barWidth} ${barHeight}" preserveAspectRatio="none">${rects}</svg><p class="code">${code}</p>`;
};

// Opens a sheet of barcode labels and price tags in a print view (a separate document outside the app,
// so it carries its own print styles).
export const printLabels = (labels: LabelInput[], options: { title: string; dir: 'ltr' | 'rtl'; lang: string }) => {
  const view = window.open('', '_blank');
  if (!view) throw new Error('The print window was blocked');
  const cells = labels
    .flatMap((label) => Array.from({ length: Math.max(label.copies, 0) }, () => label))
    .map((label) => `<div class="label"><p class="title">${escape(label.title)}</p><p class="detail">${escape(label.detail)}</p>${barcodeSvg(label.barcode)}<p class="price">${escape(label.price)}</p></div>`)
    .join('');
  view.document.write(
    `<!doctype html><html lang="${options.lang}" dir="${options.dir}"><head><meta charset="utf-8"><title>${escape(options.title)}</title>` +
      '<style>body{font-family:system-ui,sans-serif;margin:0.5rem}.sheet{display:grid;grid-template-columns:repeat(auto-fill,12rem);gap:0.25rem}' +
      '.label{border:0.0625rem dashed #999;padding:0.4rem;break-inside:avoid;font-size:0.7rem}.label p{margin:0.1rem 0}.title{font-weight:600}.detail{font-size:0.8rem;font-weight:700}' +
      '.label svg{width:100%;height:2.5rem;fill:#000}.code{text-align:center;letter-spacing:0.1em}.price{font-size:0.9rem;font-weight:700}</style></head>' +
      `<body><div class="sheet">${cells}</div></body></html>`,
  );
  view.document.close();
  view.focus();
  view.print();
};

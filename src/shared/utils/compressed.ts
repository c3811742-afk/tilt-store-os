// Large values (the demo's data) are kept gzip-compressed in the browser's storage, so they fit its size limit.
// Compression needs the browser's CompressionStream; without it the value is stored as plain text.

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(binary);
};

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const prefix = 'gz:';

export const compressText = async (text: string) => {
  if (typeof CompressionStream === 'undefined') return text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return prefix + toBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
};

export const decompressText = async (value: string) => {
  if (!value.startsWith(prefix)) return value;
  const stream = new Blob([fromBase64(value.slice(prefix.length))]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
};

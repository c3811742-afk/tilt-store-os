import type { SignatureField, SignatureFormProps, SignatureLine, SignatureValue } from './SignatureForm.types';

export const signatureFormDefaults: Required<Pick<SignatureFormProps, 'lines' | 'fields' | 'disabled' | 'showSigner'>> = {
  lines: [],
  fields: [],
  disabled: false,
  showSigner: true,
};

// A blank signature, each quantity starting from `start` (e.g. the quantity sent), or 0.
export const emptySignature = (lines: SignatureLine[], fields: SignatureField[], start: (variantId: string, field: string) => number = () => 0): SignatureValue => ({
  quantities: Object.fromEntries(lines.map((line) => [line.variantId, Object.fromEntries(fields.map((field) => [field.key, start(line.variantId, field.key)]))])),
  name: '',
  confirmed: false,
});

// The errors to show before signing: a typed name and the tick are both required.
export const signatureErrors = (value: SignatureValue, messages: { name: string; confirmed: string }) => ({
  name: value.name.trim() ? undefined : messages.name,
  confirmed: value.confirmed ? undefined : messages.confirmed,
});

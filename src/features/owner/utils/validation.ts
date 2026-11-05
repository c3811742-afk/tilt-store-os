import type { Text } from '@/shared/constants';

// Field checks for the owner's forms. Each returns the message to show, or null when the value is fine.
export const validators = (text: Text) => ({
  required: (value: string) => (value.trim() ? null : text.validation.required),
  number: (value: string) => (value.trim() !== '' && Number.isFinite(Number(value)) ? null : text.validation.number),
  positive: (value: string) => (Number(value) > 0 ? null : text.validation.positive),
  nonNegative: (value: string) => (value.trim() !== '' && Number(value) >= 0 ? null : text.validation.number),
  percent: (value: string) => (value.trim() !== '' && Number(value) >= 0 && Number(value) <= 100 ? null : text.validation.percent),
  optionalPercent: (value: string) => (value.trim() === '' || (Number(value) >= 0 && Number(value) <= 100) ? null : text.validation.percent),
  email: (value: string) => (!value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : text.validation.email),
  pin: (value: string) => (/^\d{4}$/.test(value) ? null : text.validation.pin),
});

// A number typed in a form, or null when the box is empty.
export const toNumber = (value: string) => (value.trim() === '' ? null : Number(value));

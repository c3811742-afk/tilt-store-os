export interface PinPadProps {
  label?: string; // the accessible name, e.g. "PIN"
  value?: string; // the digits entered so far
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void; // called once every digit is entered
  length?: number; // how many digits a PIN has
  error?: string;
  disabled?: boolean;
}

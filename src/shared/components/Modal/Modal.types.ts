import type { FormEvent, ReactNode } from 'react';

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode; // buttons at the bottom (e.g. Cancel and Save changes)
  width?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void; // the content becomes a form; a submit button in `actions` sends it
}

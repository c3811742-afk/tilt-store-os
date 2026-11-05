import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { modalDefaults } from './Modal.defaults';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.css';

const ModalBody = ({ onSubmit, children }: { onSubmit?: ModalProps['onSubmit']; children: ReactNode }) =>
  onSubmit ? (
    <form className={styles.content} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  ) : (
    <div className={styles.content}>{children}</div>
  );

// A dialog built on the native <dialog>: focus is trapped inside and Esc closes it.
export const Modal = (props: ModalProps) => {
  const { open, onClose, title, children, actions, width, onSubmit } = withDefaults(modalDefaults, props);
  const { text } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      style={{ '--modal-width': width } as CSSProperties}
      aria-labelledby={title ? titleId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (event.target === dialogRef.current) onClose?.();
      }}
    >
      {open && (
        <ModalBody onSubmit={onSubmit}>
          <div className={styles.header}>
            <span id={titleId}>
              {title && (
                <Text as="h2" variant="h3">
                  {title}
                </Text>
              )}
            </span>
            <button type="button" className={styles.close} aria-label={text.common.close} onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </ModalBody>
      )}
    </dialog>
  );
};

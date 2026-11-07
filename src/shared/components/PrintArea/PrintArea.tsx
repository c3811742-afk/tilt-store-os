import { createPortal } from 'react-dom';
import type { PrintAreaProps } from './PrintArea.types';
import styles from './PrintArea.module.css';

// What window.print() prints: hidden on screen, and the only thing on the page when printing (the app's frame
// hides itself in print). Put the receipt or summary inside; show it on screen separately.
export const PrintArea = ({ children }: PrintAreaProps) => createPortal(<div className={styles.printArea}>{children}</div>, document.body);

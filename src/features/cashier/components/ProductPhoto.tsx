import { useState } from 'react';
import styles from './counter.module.css';

// A product's photo in a fixed square, or its first letter when there is none (or it can't load).
export const ProductPhoto = ({ src, name }: { src?: string; name: string }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.photo}>
      {src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
};

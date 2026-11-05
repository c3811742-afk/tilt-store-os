import { Link } from 'react-router';
import { vars } from '@/shared/theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import type { PageHeaderProps } from './PageHeader.types';
import styles from './PageHeader.module.css';

// The top of every page: its title, a line about it, and its main actions.
export const PageHeader = ({ title, subtitle, actions, back }: PageHeaderProps) => (
  <header className={styles.header}>
    {back && (
      <Link to={back.to} className={styles.back}>
        <Icon name="arrowStart" />
        {back.label}
      </Link>
    )}
    <div className={styles.row}>
      <div className={styles.titles}>
        {title && (
          <Text as="h1" variant="h1" autoDirection>
            {title}
          </Text>
        )}
        {subtitle && <Text color={vars.colors.textMuted}>{subtitle}</Text>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  </header>
);

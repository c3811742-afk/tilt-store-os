import type { CSSProperties } from 'react';
import { useBranchScope, useFormat, useLocale } from '@/shared/hooks';
import { cx, withDefaults } from '@/shared/utils';
import controls from '../Field/controls.module.css';
import { Text } from '../Text';
import { branchSwitcherDefaults } from './BranchSwitcher.defaults';
import type { BranchSwitcherProps } from './BranchSwitcher.types';
import styles from './BranchSwitcher.module.css';

// The branch the pages show, in the top bar. A select for people who work in several branches, the name otherwise.
export const BranchSwitcher = (props: BranchSwitcherProps) => {
  const { width } = withDefaults(branchSwitcherDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { branchId, branchIds, setBranchId } = useBranchScope();

  if (branchIds.length < 2)
    return (
      <Text as="span" variant="h4">
        {format.branch(branchId)}
      </Text>
    );
  return (
    <select
      aria-label={text.shell.branch}
      className={cx(controls.control, styles.switcher)}
      style={{ '--branch-switcher-width': width } as CSSProperties}
      value={branchId}
      onChange={(event) => setBranchId(event.target.value)}
    >
      {branchIds.map((id) => (
        <option key={id} value={id}>
          {format.branch(id)}
        </option>
      ))}
    </select>
  );
};

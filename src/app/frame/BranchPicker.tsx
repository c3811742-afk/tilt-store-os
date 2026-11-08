import { branchRoles } from '@/shared/api';
import { SelectField, Text } from '@/shared/components';
import { useLocale, useSession, useBranchChoice } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from './AppFrame.module.css';

// The branch the person is working in, always visible. People with more than one branch can switch.
export const BranchPicker = () => {
  const { text } = useLocale();
  const { session } = useSession();
  const { branch, branches, setBranchId } = useBranchChoice();
  // Only for roles that work in one branch; owners, IT, drivers and online orders staff work across branches.
  if (!branch || session?.isOwner || !session?.roles.some((role) => branchRoles.includes(role))) return null;
  if (branches.length < 2) {
    return (
      <span className={styles.branch}>
        <Text as="span" variant="caption" color={vars.colors.textMuted}>
          {text.shell.workingIn}
        </Text>
        <Text as="span" variant="bodySm">
          {branch.name}
        </Text>
      </span>
    );
  }
  return (
    // The label is read by screen readers but not shown, so the picker lines up with the rest of the top bar.
    <label className={styles.branchPicker}>
      <span className={styles.hiddenLabel}>{text.shell.workingIn}</span>
      <SelectField value={branch.id} onChange={setBranchId} options={branches.map((current) => ({ value: current.id, label: current.name }))} width="100%" />
    </label>
  );
};

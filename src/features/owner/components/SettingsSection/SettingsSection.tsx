import type { ReactNode } from 'react';
import { Button, Card, Notice, Stack, Text } from '@/shared/components';
import { useErrorMessage, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

export interface SettingsSectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
  draft: { changed: boolean; saved: boolean; busy: boolean; error: unknown; save: () => Promise<void>; reset: () => Promise<void> };
}

// A card of settings with Save changes and Reset to defaults (the shared defaults file).
export const SettingsSection = ({ title, hint, children, draft }: SettingsSectionProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  return (
    <Card
      title={title}
      actions={
        <>
          <Button variant="muted" size="sm" disabled={draft.busy} onClick={() => void draft.reset()}>
            {text.common.resetToDefaults}
          </Button>
          <Button size="sm" disabled={!draft.changed || draft.busy} onClick={() => void draft.save()}>
            {text.common.saveChanges}
          </Button>
        </>
      }
    >
      {hint && (
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {hint}
        </Text>
      )}
      {draft.saved && <Notice tone="success">{text.common.saved}</Notice>}
      {Boolean(draft.error) && <Notice tone="danger">{errorMessage(draft.error)}</Notice>}
      <Stack gap={vars.spacing[4]}>{children}</Stack>
    </Card>
  );
};

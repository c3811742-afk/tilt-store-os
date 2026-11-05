import { useState } from 'react';
import { resetSettings, updateSettings } from '@/shared/api';
import { useAction, useReference } from '@/shared/hooks';
import type { Settings } from '@/shared/types';

// Edits part of the settings: a draft over the saved values, Save, and Reset to the shared defaults.
export const useSettingsDraft = <K extends keyof Settings>(keys: K[]) => {
  const { settings } = useReference();
  const action = useAction();
  const [draft, setDraft] = useState<Partial<Pick<Settings, K>>>({});
  const [saved, setSaved] = useState(false);
  const values = { ...(Object.fromEntries(keys.map((key) => [key, settings[key]])) as Pick<Settings, K>), ...draft };

  return {
    values,
    changed: Object.keys(draft).length > 0,
    saved,
    busy: Boolean(action.busy),
    error: action.error,
    set: <T extends K>(key: T, value: Settings[T]) => {
      setSaved(false);
      setDraft((current) => ({ ...current, [key]: value }));
    },
    save: async () => {
      if (await action.run('save', () => updateSettings(values))) {
        setDraft({});
        setSaved(true);
      }
    },
    reset: async () => {
      if (await action.run('reset', () => resetSettings(keys))) {
        setDraft({});
        setSaved(true);
      }
    },
  };
};

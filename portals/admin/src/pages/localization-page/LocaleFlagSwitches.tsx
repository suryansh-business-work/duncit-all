import { FormControlLabel, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/shell';

/** The boolean fields of a locale row, in the order the dialog shows them. */
export type LocaleFlag = 'is_active' | 'is_rtl' | 'is_default';

interface Props {
  isActive: boolean;
  isRtl: boolean;
  isDefault: boolean;
  /**
   * This row IS the platform's source language. Its "default" and "active"
   * switches are locked: every other locale falls back to it, so turning either
   * off would leave the platform with no language to fall back to. Moving the
   * default is done by promoting a different row, which demotes this one.
   */
  lockedAsDefault: boolean;
  onChange: (field: LocaleFlag, value: boolean) => void;
}

export default function LocaleFlagSwitches({
  isActive,
  isRtl,
  isDefault,
  lockedAsDefault,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const lockHint = t('admin.localization.defaultLockedSwitch');

  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Switch
            checked={isActive}
            disabled={lockedAsDefault}
            onChange={(_, value) => onChange('is_active', value)}
          />
        }
        label={lockedAsDefault ? lockHint : t('admin.localization.activeHint')}
      />
      <FormControlLabel
        control={<Switch checked={isRtl} onChange={(_, value) => onChange('is_rtl', value)} />}
        label={t('admin.localization.rtl')}
      />
      <FormControlLabel
        control={
          <Switch
            checked={isDefault}
            disabled={lockedAsDefault}
            onChange={(_, value) => onChange('is_default', value)}
          />
        }
        label={lockedAsDefault ? lockHint : t('admin.localization.defaultHint')}
      />
    </Stack>
  );
}

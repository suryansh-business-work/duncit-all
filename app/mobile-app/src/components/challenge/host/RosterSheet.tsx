import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';
import { makeDeviceId } from '@duncit/user-core';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { makeRosterSchema, type RosterValues } from '@/forms/challenge';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  open: boolean;
  challenge: Pick<PodChallengeView, 'participant_mode' | 'competitors'>;
  actions: HostChallengeActions;
  onClose: () => void;
}

/** A stable id for a new row; the server keeps the ids it is given. */
const newRowId = () => makeDeviceId().slice(-8);

const valuesOf = (challenge: Props['challenge']): RosterValues => ({
  competitors: challenge.competitors.map((c) => ({
    competitor_id: c.competitor_id,
    name: c.name,
    user_id: c.user_id ?? '',
  })),
});

/**
 * Who competes (players, or teams in team mode), by name. Linking competitors
 * to attendees, team rosters and judges are managed in Host Studio on the web;
 * links already made there are kept when this saves.
 */
export function RosterSheet({ open, challenge, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState } = useForm<RosterValues, unknown, RosterValues>({
    resolver: formResolver<RosterValues>(makeRosterSchema(t)),
    defaultValues: valuesOf(challenge),
  });
  const rows = useFieldArray({ control, name: 'competitors' });
  useEffect(() => {
    if (open) reset(valuesOf(challenge));
  }, [open, challenge, reset]);

  const submit = handleSubmit(async (values) => {
    const ok = await actions.roster({
      competitors: values.competitors.map((c) => ({
        competitor_id: c.competitor_id || null,
        name: c.name.trim(),
        user_id: c.user_id || null,
      })),
    });
    if (ok) onClose();
  });
  const listError =
    formState.errors.competitors?.message ?? formState.errors.competitors?.root?.message;

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="challenge-roster-dialog"
      title={t(
        challenge.participant_mode === 'TEAM'
          ? 'mweb.challenge.teams'
          : 'mweb.challenge.competitors',
      )}
      closeLabel={t('mweb.challenge.cancel')}
      dismissOnBackdrop={!actions.busy}
      showCloseButton={false}
      footer={
        <ConfirmFooter
          cancelLabel={t('mweb.challenge.cancel')}
          confirmLabel={t('mweb.challenge.saveRoster')}
          busy={actions.busy}
          destructive={false}
          cancelTestID="challenge-roster-cancel"
          confirmTestID="challenge-roster-save"
          onCancel={onClose}
          onConfirm={() => {
            submit().catch(() => undefined);
          }}
        />
      }
    >
      <YStack gap={12}>
        {listError ? <NoticeCard tone="danger" title={listError} /> : null}
        {actions.error ? <NoticeCard tone="danger" title={actions.error} /> : null}
        {rows.fields.map((field, index) => (
          <XStack key={field.id} gap={8} alignItems="flex-end">
            <YStack flex={1}>
              <FormTextField
                control={control}
                name={`competitors.${index}.name`}
                label={t('mweb.challenge.fields.name')}
                required
                maxLength={60}
              />
            </YStack>
            <DuncitButton
              size="sm"
              variant="ghost"
              tone="danger"
              label={t('mweb.challenge.removeRow')}
              onPress={() => rows.remove(index)}
              testID={`challenge-roster-remove-${index}`}
            />
          </XStack>
        ))}
        <DuncitButton
          size="sm"
          variant="outline"
          label={t('mweb.challenge.addCompetitor')}
          onPress={() => rows.append({ competitor_id: newRowId(), name: '', user_id: '' })}
          testID="challenge-roster-add"
        />
      </YStack>
    </DuncitDialog>
  );
}

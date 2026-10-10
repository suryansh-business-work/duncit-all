import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { makeDeviceId } from '@duncit/user-core';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { ROSTER_NAME_MAX, makeRosterSchema, type RosterValues } from '@/forms/challenge';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import { usePodAttendeeNames } from '@/hooks/usePodAttendeeNames';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  open: boolean;
  challenge: Pick<PodChallengeView, 'pod_id' | 'participant_mode' | 'competitors'>;
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
 * Who competes (players, or teams in team mode). A player added from the
 * attendee chips is LINKED to that attendee — which is what lets them answer
 * the quiz, buzz, check in and submit from their own phone; a typed name is a
 * competitor the host scores. Team rosters and judges are managed in Host
 * Studio on the web; links already made there are kept when this saves.
 */
export function RosterSheet({ open, challenge, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState } = useForm<RosterValues, unknown, RosterValues>({
    resolver: formResolver<RosterValues>(makeRosterSchema(t)),
    defaultValues: valuesOf(challenge),
  });
  const rows = useFieldArray({ control, name: 'competitors' });
  const individual = challenge.participant_mode !== 'TEAM';
  const { attendees, error: attendeesError } = usePodAttendeeNames(
    challenge.pod_id,
    open && individual,
  );
  const linked = new Set(rows.fields.map((row) => row.user_id).filter(Boolean));
  const unlinked = attendees.filter((a) => !linked.has(a.user_id));
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
                hint={field.user_id ? t('mweb.challenge.fields.attendee') : undefined}
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
        {attendeesError ? <NoticeCard tone="warning" title={attendeesError} /> : null}
        {unlinked.length > 0 && (
          <YStack gap={6}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {t('mweb.challenge.addFromAttendees')}
            </Text>
            <XStack gap={6} flexWrap="wrap">
              {unlinked.map((a) => (
                <MediumToggle
                  key={a.user_id}
                  label={a.name}
                  selected={false}
                  onPress={() =>
                    rows.append({
                      competitor_id: newRowId(),
                      name: a.name.slice(0, ROSTER_NAME_MAX),
                      user_id: a.user_id,
                    })
                  }
                />
              ))}
            </XStack>
          </YStack>
        )}
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

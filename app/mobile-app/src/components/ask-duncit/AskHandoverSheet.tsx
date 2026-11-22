import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  ASK_DUNCIT_HANDOVER_SUMMARY_MAX,
  ASK_DUNCIT_HANDOVER_TEAMS,
  handoverTeamKey,
} from '@duncit/utils';
import {
  askDuncitHandoverDefaults,
  makeAskDuncitHandoverSchema,
  type AskDuncitHandoverValues,
} from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { ChoiceChip } from '@/components/brand-orders/ChoiceChip';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  /** Resolves the ticket number, or null when it could not be raised. */
  onSubmit: (team: string, summary: string) => Promise<string | null>;
}

function HandoverDialog({ open, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [ticket, setTicket] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const schema = useMemo(() => makeAskDuncitHandoverSchema(t), [t]);
  const { control, handleSubmit } = useForm<
    AskDuncitHandoverValues,
    unknown,
    AskDuncitHandoverValues
  >({
    resolver: formResolver<AskDuncitHandoverValues>(schema),
    defaultValues: askDuncitHandoverDefaults,
  });

  const submit = handleSubmit(async (values) => {
    setFailed(false);
    const no = await onSubmit(values.team, values.summary);
    if (no) setTicket(no);
    else setFailed(true);
  });

  const footer = ticket ? (
    <DuncitButton
      testID="ask-duncit-handover-done"
      label={t('askDuncit.close')}
      onPress={onClose}
      fullWidth
    />
  ) : (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          label={t('askDuncit.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
          disabled={busy}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="ask-duncit-handover-submit"
          label={t('askDuncit.handover.submit')}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          fullWidth
          disabled={busy}
          loading={busy}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      testID="ask-duncit-handover"
      title={t('askDuncit.handover.title')}
      closeLabel={t('askDuncit.cancel')}
      variant="center"
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      {ticket ? (
        <Text role="status" fontSize={14} color="$color">
          {t('askDuncit.handover.done', { vars: { ticket } })}
        </Text>
      ) : (
        <YStack gap={12}>
          <Text fontSize={14} color="$muted">
            {t('askDuncit.handover.intro')}
          </Text>
          <Controller
            control={control}
            name="team"
            render={({ field, fieldState }) => (
              <YStack gap={8}>
                <Text fontSize={12.5} fontWeight="600" color="$muted">
                  {t('askDuncit.handover.teamLabel')}
                </Text>
                <XStack
                  gap={8}
                  flexWrap="wrap"
                  role="group"
                  aria-label={t('askDuncit.handover.teamLabel')}
                >
                  {ASK_DUNCIT_HANDOVER_TEAMS.map((team) => (
                    <ChoiceChip
                      key={team}
                      testID={`ask-duncit-team-${team}`}
                      label={t(handoverTeamKey(team))}
                      active={field.value === team}
                      onPress={() => field.onChange(team)}
                    />
                  ))}
                </XStack>
                {fieldState.error ? (
                  <Text role="alert" fontSize={12.5} color="$danger">
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </YStack>
            )}
          />
          <FormTextField
            control={control}
            name="summary"
            label={t('askDuncit.handover.summaryLabel')}
            maxLength={ASK_DUNCIT_HANDOVER_SUMMARY_MAX}
            multiline
          />
          {failed ? (
            <Text role="alert" fontSize={12.5} color="$danger">
              {t('askDuncit.handover.failed')}
            </Text>
          ) : null}
        </YStack>
      )}
    </DuncitDialog>
  );
}

/** "Talk to a person" — the Tamagui twin of mWeb's HandoverDialog. Remounted per open, so it starts clean. */
export function AskHandoverSheet(props: Readonly<Props>) {
  return props.open ? <HandoverDialog {...props} /> : null;
}

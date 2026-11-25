import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  AUTO_REPLY_KINDS,
  KIND_HINT,
  KIND_LABEL,
  RULE_LIMITS,
  autoReplyRuleSchema,
  messagingAccounts,
  ruleFormValues,
  ruleInput,
  type AutoReplyRuleFormProps,
  type AutoReplyRuleFormValues,
} from './auto-reply-rule.types';

/**
 * One auto-reply rule: what it answers, the words it listens for, what it
 * says, for which accounts, and whether it may skip Approvals. Read-only for
 * anyone who may not change rules; the server checks everything again.
 */
export default function AutoReplyRuleForm({ rule, accounts, canEdit, onSubmit, onCancel, onDelete }: Readonly<AutoReplyRuleFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => autoReplyRuleSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<AutoReplyRuleFormValues, unknown, AutoReplyRuleFormValues>({
    defaultValues: ruleFormValues(rule),
    resolver: zodResolver(schema) as unknown as Resolver<AutoReplyRuleFormValues, unknown, AutoReplyRuleFormValues>,
    mode: 'onChange',
  });
  const kind = useWatch({ control, name: 'kind' });
  const disabled = !canEdit || formState.isSubmitting;
  const kindOptions = AUTO_REPLY_KINDS.map((value) => ({ value, label: t(KIND_LABEL[value]) }));
  const accountOptions = messagingAccounts(accounts).map((account) => ({ value: account.id, label: account.handle ? `${account.name} · ${account.handle}` : account.name }));
  const save = handleSubmit((values) => onSubmit(ruleInput(values)));

  return (
    <form noValidate onSubmit={save} data-testid="auto-reply-rule-form">
      <Stack spacing={2} sx={{ pt: 1 }}>
        {!canEdit && (
          <Alert severity="warning" data-testid="auto-reply-read-only">
            {t('marketing.autoReplies.readOnly')}
          </Alert>
        )}
        <RhfTextField control={control} name="name" label={t('marketing.autoReplies.name')} hint={t('marketing.autoReplies.nameHint')} required disabled={disabled} />
        <RhfSelect control={control} name="kind" label={t('marketing.autoReplies.kind')} hint={t(KIND_HINT[kind])} options={kindOptions} required disabled={disabled} />
        {kind !== 'WELCOME' && (
          <RhfTextField
            control={control}
            name="keywords"
            label={t('marketing.autoReplies.keywords')}
            hint={t('marketing.autoReplies.keywordsHint')}
            required
            disabled={disabled}
          />
        )}
        <RhfTextField
          control={control}
          name="reply_text"
          label={t('marketing.autoReplies.replyText')}
          hint={t('marketing.autoReplies.replyTextHint')}
          multiline
          minRows={3}
          required
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: RULE_LIMITS.reply } }}
        />
        <RhfSelect
          control={control}
          name="account_ids"
          label={t('marketing.autoReplies.accounts')}
          hint={t('marketing.autoReplies.accountsHint')}
          options={accountOptions}
          multiple
          disabled={disabled}
        />
        <RhfSwitch control={control} name="trusted" label={t('marketing.autoReplies.trusted')} hint={t('marketing.autoReplies.trustedHint')} disabled={disabled} />
        <RhfSwitch control={control} name="enabled" label={t('marketing.autoReplies.enabled')} hint={t('marketing.autoReplies.enabledHint')} disabled={disabled} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {canEdit && onDelete && (
            <DuncitButton color="error" startIcon={<DeleteOutlineIcon />} onClick={onDelete} disabled={formState.isSubmitting} data-testid="auto-reply-delete">
              {t('shell.common.delete')}
            </DuncitButton>
          )}
          <DuncitButton onClick={onCancel} data-testid="auto-reply-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
          {canEdit && (
            <DuncitButton
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!formState.isDirty}
              loading={formState.isSubmitting}
              data-testid="auto-reply-save"
            >
              {t('marketing.autoReplies.save')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
    </form>
  );
}

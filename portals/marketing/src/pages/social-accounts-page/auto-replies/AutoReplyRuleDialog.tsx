import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { AutoReplyRuleForm } from '../auto-reply-rule-form';
import type { SocialAccount } from '../queries';
import {
  CREATE_SOCIAL_AUTO_REPLY_RULE,
  DELETE_SOCIAL_AUTO_REPLY_RULE,
  UPDATE_SOCIAL_AUTO_REPLY_RULE,
  type SocialAutoReplyRule,
  type SocialAutoReplyRuleInput,
} from './autoReply.queries';

interface Props {
  /** Open with a rule to change it, with `null` to add one; closed when undefined. */
  rule: SocialAutoReplyRule | null | undefined;
  accounts: readonly SocialAccount[];
  canEdit: boolean;
  onClose: () => void;
  /** After a save or a delete, so the table reads again. */
  onChanged: () => void;
}

/** Add, change or delete one auto-reply rule; the server's refusal is shown as it worded it. */
export default function AutoReplyRuleDialog({ rule, accounts, canEdit, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [createMut] = useMutation<{ createSocialAutoReplyRule: SocialAutoReplyRule }>(CREATE_SOCIAL_AUTO_REPLY_RULE);
  const [updateMut] = useMutation<{ updateSocialAutoReplyRule: SocialAutoReplyRule }>(UPDATE_SOCIAL_AUTO_REPLY_RULE);
  const [deleteMut] = useMutation<{ deleteSocialAutoReplyRule: boolean }>(DELETE_SOCIAL_AUTO_REPLY_RULE);
  const saved = rule ?? null;

  const done = (message: string) => {
    notify(message, 'success');
    onChanged();
    onClose();
  };

  const save = async (input: SocialAutoReplyRuleInput) => {
    try {
      if (saved) await updateMut({ variables: { id: saved.id, input } });
      else await createMut({ variables: { input } });
      done(saved ? t('marketing.autoReplies.saved') : t('marketing.autoReplies.created'));
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const remove = async (target: SocialAutoReplyRule) => {
    const ok = await confirm({
      title: t('marketing.autoReplies.deleteTitle'),
      message: t('marketing.autoReplies.deleteBody'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: target.id } });
      done(t('marketing.autoReplies.deleted'));
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Dialog open={rule !== undefined} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="auto-reply-dialog-title">
      <DialogTitle id="auto-reply-dialog-title">{saved ? t('marketing.autoReplies.titleEdit') : t('marketing.autoReplies.titleNew')}</DialogTitle>
      <DialogContent>
        {rule !== undefined && (
          <AutoReplyRuleForm
            key={saved?.id ?? 'new'}
            rule={saved}
            accounts={accounts}
            canEdit={canEdit}
            onSubmit={save}
            onCancel={onClose}
            onDelete={saved ? () => remove(saved) : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

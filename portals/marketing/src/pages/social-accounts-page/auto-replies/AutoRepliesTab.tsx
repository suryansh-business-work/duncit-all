import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import InboxQueueTable from '../../inbox-page/InboxQueueTable';
import type { SocialAccount } from '../queries';
import { SOCIAL_SETTINGS, type SocialSettings } from '../settings/settings.queries';
import { SOCIAL_AUTO_REPLY_RULES_TABLE, type SocialAutoReplyRule } from './autoReply.queries';
import { getAutoReplyColumns } from './autoReplyColumns';
import AutoReplyRuleDialog from './AutoReplyRuleDialog';

/** Changing rules is a manager's call — the same roles the server allows (social.autoReply.resolver.ts). */
const RULE_MANAGERS = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);
const NO_VARIABLES: Record<string, string> = {};
const getRowId = (row: SocialAutoReplyRule) => row.id;

interface Props {
  accounts: readonly SocialAccount[];
}

/**
 * Marketing → Social → Auto-replies: the rules that answer people who wrote
 * first, what they promise never to do, and whether Settings has them on.
 * Everyone who works the Inbox reads them; only a manager adds or changes one.
 */
export default function AutoRepliesTab({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUserData();
  const canEdit = (user?.roles ?? []).some((role) => RULE_MANAGERS.has(role));
  const { data } = useQuery<{ socialSettings: SocialSettings }>(SOCIAL_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const settings = data?.socialSettings;
  const columns = useMemo(() => getAutoReplyColumns(t), [t]);
  const refetchRef = useRef<(() => void) | null>(null);
  // undefined: closed; null: a new rule; a rule: that rule.
  const [open, setOpen] = useState<SocialAutoReplyRule | null | undefined>(undefined);

  return (
    <Stack spacing={2} data-testid="auto-replies-tab">
      <Alert severity="info">{t('marketing.autoReplies.intro')}</Alert>
      {settings && !settings.auto_reply_enabled && (
        <Alert severity="warning" data-testid="auto-replies-off">
          {t('marketing.autoReplies.switchedOff')}
        </Alert>
      )}
      {settings?.auto_reply_enabled && settings.auto_reply_requires_approval && (
        <Alert severity="info" data-testid="auto-replies-approval">
          {t('marketing.autoReplies.approvalNote')}
        </Alert>
      )}
      <InboxQueueTable<SocialAutoReplyRule>
        query={SOCIAL_AUTO_REPLY_RULES_TABLE}
        field="socialAutoReplyRulesTable"
        variables={NO_VARIABLES}
        tableId="marketing-auto-reply-rules"
        ariaLabel={t('marketing.autoReplies.tableLabel')}
        emptyText={t('marketing.autoReplies.empty')}
        searchPlaceholder={t('marketing.autoReplies.search')}
        columns={columns}
        getRowId={getRowId}
        onOpen={setOpen}
        refetchRef={refetchRef}
        toolbarActions={
          canEdit ? (
            <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(null)} data-testid="auto-reply-new">
              {t('marketing.autoReplies.newRule')}
            </DuncitButton>
          ) : undefined
        }
      />
      <AutoReplyRuleDialog
        rule={open}
        accounts={accounts}
        canEdit={canEdit}
        onClose={() => setOpen(undefined)}
        onChanged={() => refetchRef.current?.()}
      />
    </Stack>
  );
}

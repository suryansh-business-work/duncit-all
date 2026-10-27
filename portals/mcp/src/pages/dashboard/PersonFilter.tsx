import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { MenuItem, TextField } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { mcpLog } from '../../lib/logger';
import { MCP_PERSON_LOOKUP, type PersonLookupData } from './queries';

export interface PersonPick {
  email: string;
  userId: string;
}

interface PersonFilterProps {
  /** The people the current window has calls from, by email. */
  emails: readonly string[];
  value: PersonPick | null;
  onChange: (person: PersonPick | null) => void;
}

/** The bucket key the server gives calls whose person has no email. */
const NO_EMAIL = 'unknown';

/**
 * Managers only: narrow the dashboard to one person. The summary is filtered
 * by user id while its per-person rows are keyed by email, so picking one looks
 * the id up from that person's newest call first.
 */
export default function PersonFilter({ emails, value, onChange }: Readonly<PersonFilterProps>) {
  const { t } = useTranslation();
  const [lookup, { loading }] = useLazyQuery<PersonLookupData, { email: string }>(MCP_PERSON_LOOKUP, {
    fetchPolicy: 'network-only',
  });
  const [pending, setPending] = useState<string | null>(null);
  const options = value && !emails.includes(value.email) ? [value.email, ...emails] : emails;

  const choose = async (email: string) => {
    if (!email) {
      onChange(null);
      return;
    }
    setPending(email);
    try {
      // A failed lookup is reported as itself, not as "nobody found".
      const { data, error } = await lookup({ variables: { email } });
      if (error) throw error;
      const userId = data?.mcpToolCallsTable.rows[0]?.user_id;
      if (userId) onChange({ email, userId });
      else notifyError(t('mcp.dashboard.personNotFound'));
    } catch (error) {
      notifyError(parseApiError(error, t('mcp.dashboard.personNotFound')));
    } finally {
      setPending(null);
    }
  };

  return (
    <TextField
      select
      size="small"
      label={t('mcp.dashboard.person')}
      value={pending ?? value?.email ?? ''}
      onChange={(event) => fireAndForget(choose(event.target.value), mcpLog, 'McpDashboard', 'PersonFilter')}
      disabled={loading}
      sx={{ minWidth: 240 }}
    >
      <MenuItem value="">{t('mcp.dashboard.everyone')}</MenuItem>
      {options
        .filter((email) => email !== NO_EMAIL)
        .map((email) => (
          <MenuItem key={email} value={email}>
            {email}
          </MenuItem>
        ))}
    </TextField>
  );
}

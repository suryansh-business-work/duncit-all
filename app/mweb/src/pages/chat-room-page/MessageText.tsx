import { Fragment, type MouseEvent } from 'react';
import { Link, Typography } from '@mui/material';
import { mentionTarget, splitMentions } from '@duncit/utils';
import type { ChatUser } from '@duncit/gql-types';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  text: string;
  mine: boolean;
  /** The people this message mentions, named by the server. */
  mentioned: ReadonlyArray<Pick<ChatUser, 'user_id' | 'full_name'>>;
  onOpenProfile: (userId: string) => void;
}

/**
 * A message's words with each real @mention drawn as a link to that profile.
 * An @word that names nobody the server recorded stays plain text.
 */
export default function MessageText({ text, mine, mentioned, onOpenProfile }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {splitMentions(text).map((part, i) => {
        const userId = part.mention ? mentionTarget(part.text, mentioned) : null;
        if (!userId) return <Fragment key={i}>{part.text}</Fragment>;
        const name = mentioned.find((m) => m.user_id === userId)?.full_name ?? part.text;
        return (
          <Link
            key={i}
            component="button"
            type="button"
            data-testid={`chat-mention-${userId}`}
            aria-label={t('mweb.chatRoom.mention.openProfile', { vars: { name } })}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onOpenProfile(userId);
            }}
            onDoubleClick={(e: MouseEvent) => e.stopPropagation()}
            sx={{ fontWeight: 700, color: mine ? 'inherit' : 'primary.main', verticalAlign: 'baseline', font: 'inherit' }}
          >
            {part.text}
          </Link>
        );
      })}
    </Typography>
  );
}

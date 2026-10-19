import { ButtonBase, Typography } from '@mui/material';
import { chatReplyText } from '@duncit/utils';
import type { PodMessageReplyTo } from '@duncit/gql-types';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  quote: Pick<PodMessageReplyTo, 'id' | 'user_name' | 'text' | 'type' | 'deleted'>;
  mine: boolean;
  /** Scrolls to the original when it is loaded. */
  onJump: (messageId: string) => void;
}

/** The answered line inside a reply bubble; activating it shows the original. */
export default function MessageQuote({ quote, mine, onJump }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = quote.user_name || '';
  return (
    <ButtonBase
      data-testid={`chat-quote-${quote.id}`}
      aria-label={t('mweb.chatRoom.reply.showOriginal', { vars: { name } })}
      onClick={(e) => {
        e.stopPropagation();
        onJump(quote.id);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        mb: 0.5,
        px: 1,
        py: 0.5,
        borderLeft: 3,
        borderColor: mine ? 'primary.contrastText' : 'primary.main',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }} noWrap>
        {name}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }} noWrap>
        {chatReplyText(quote, t)}
      </Typography>
    </ButtonBase>
  );
}

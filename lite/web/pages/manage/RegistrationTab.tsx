import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Box, Card, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { priceLabel } from '../../../shared/format';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_SET_REGISTRATION_OPEN } from '../../graphql/events';
import { paths } from '../../lib/paths';

/** A titled list block of the Registration tab. */
function Block({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack spacing={1}>
      <Typography variant="h3" component="h2">
        {title}
      </Typography>
      <Card>{children}</Card>
    </Stack>
  );
}

const ROW = { px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } } as const;

/** Open or close registration, and see what guests are asked: tickets, limits and questions. */
export function RegistrationTab({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const [setOpen, { loading }] = useMutation(LITE_SET_REGISTRATION_OPEN);
  const live = event.status !== 'CANCELLED';

  const toggle = async (open: boolean) => {
    try {
      await setOpen({ variables: { id: event.id, open } });
      notifySuccess(t(open ? 'liteWeb.manage.registration.opened' : 'liteWeb.manage.registration.closed'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={3} data-testid="manage-registration">
      <Card sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={event.registration_open}
              disabled={!live || loading}
              onChange={(_e, open) => {
                toggle(open).catch((error: unknown) => notifyError(parseApiError(error)));
              }}
              slotProps={{ input: { 'data-testid': 'registration-open' } as Record<string, string> }}
            />
          }
          label={
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>{t(event.registration_open ? 'liteWeb.manage.registration.open' : 'liteWeb.manage.registration.shut')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('liteWeb.manage.registration.openHint')}
              </Typography>
            </Stack>
          }
        />
      </Card>
      <Block title={t('liteWeb.manage.registration.limits')}>
        <Box sx={ROW}>
          <Typography sx={{ flexGrow: 1 }}>{t('liteWeb.eventForm.capacity')}</Typography>
          <Typography color="text.secondary">{event.capacity == null ? t('liteWeb.eventForm.unlimited') : event.capacity}</Typography>
        </Box>
        <Box sx={ROW}>
          <Typography sx={{ flexGrow: 1 }}>{t('liteWeb.eventForm.requireApprovalRow')}</Typography>
          <Typography color="text.secondary">{t(event.require_approval ? 'lite.common.yes' : 'lite.common.no')}</Typography>
        </Box>
      </Block>
      <Block title={t('liteWeb.eventForm.tickets')}>
        {event.tickets.map((ticket) => (
          <Box key={ticket.id} sx={ROW} data-testid="registration-ticket">
            <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>{ticket.name}</Typography>
            <Typography color="text.secondary">{priceLabel(ticket.price, t('lite.common.free'))}</Typography>
            <Typography color="text.secondary">{t('liteWeb.manage.registration.sold', { vars: { sold: ticket.sold, total: ticket.quantity ?? t('liteWeb.eventForm.unlimited') } })}</Typography>
          </Box>
        ))}
      </Block>
      <Block title={t('liteWeb.eventForm.questions')}>
        {event.questions.length === 0 ? (
          <Box sx={ROW}>
            <Typography color="text.secondary">{t('liteWeb.eventForm.noQuestions')}</Typography>
          </Box>
        ) : (
          event.questions.map((question) => (
            <Box key={question.id} sx={ROW}>
              <Typography sx={{ flexGrow: 1 }}>{question.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`liteWeb.eventForm.questionTypes.${question.type}`)}
              </Typography>
            </Box>
          ))
        )}
      </Block>
      {live ? (
        <DuncitButton component={RouterLink} to={paths.eventEdit(event.slug)} variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ alignSelf: 'flex-start' }} data-testid="registration-edit">
          {t('liteWeb.manage.registration.edit')}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}

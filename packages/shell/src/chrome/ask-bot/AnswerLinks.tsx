import { Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { useTranslation } from '../../i18n/useTranslation';
import type { AskBotLink } from './queries';

interface RowProps {
  link: AskBotLink;
}

/**
 * One place the answer points to.
 *
 * The URL arrives already resolved for this environment, so the button opens
 * localhost while developing and the real console otherwise — the bot never
 * writes an address and so can never write the wrong one.
 *
 * Three shapes, in order of what stops you: a console you cannot open yet is a
 * locked row that says where to ask, a surface with no address here (the app,
 * locally) says so, and everything else is a link.
 */
function LinkRow({ link }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const caption = `${link.surface_name} · ${link.path}`;

  if (!link.has_access) {
    return (
      <Tooltip title={t('shell.askBot.noAccessHint')}>
        <Chip
          icon={<LockOutlinedIcon />}
          variant="outlined"
          label={`${link.label} — ${t('shell.askBot.noAccess')}`}
          sx={{ justifyContent: 'flex-start', height: 'auto', py: 0.75, '& .MuiChip-label': { whiteSpace: 'normal' } }}
        />
      </Tooltip>
    );
  }

  if (!link.url) {
    return (
      <Chip
        icon={<PhoneIphoneIcon />}
        variant="outlined"
        label={`${link.label} — ${t('shell.askBot.noLocalAddress')}`}
        sx={{ justifyContent: 'flex-start', height: 'auto', py: 0.75, '& .MuiChip-label': { whiteSpace: 'normal' } }}
      />
    );
  }

  return (
    <Button
      href={link.url}
      target="_blank"
      rel="noreferrer"
      variant="outlined"
      size="small"
      endIcon={<OpenInNewIcon />}
      sx={{ justifyContent: 'space-between', textAlign: 'left', textTransform: 'none' }}
    >
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {link.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {caption}
        </Typography>
      </Stack>
    </Button>
  );
}

interface Props {
  links: AskBotLink[];
}

export function AnswerLinks({ links }: Readonly<Props>) {
  if (links.length === 0) return null;
  return (
    <Stack spacing={0.75} sx={{ mt: 1 }}>
      {links.map((link) => (
        <LinkRow key={`${link.surface_key}${link.path}`} link={link} />
      ))}
    </Stack>
  );
}

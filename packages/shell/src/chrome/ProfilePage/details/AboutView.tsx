import { Link, Stack, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ProfileLink } from '../queries';

interface Props {
  bio: string | null;
  links: readonly ProfileLink[];
}

/** The saved bio and links, read-only. */
export function AboutView({ bio, links }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Typography
        variant="body2"
        data-testid="profile-bio"
        sx={{ whiteSpace: 'pre-line', color: bio ? 'text.primary' : 'text.secondary' }}
      >
        {bio || t('shell.profile.details.noBio')}
      </Typography>
      {links.length > 0 ? (
        <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {links.map((link) => (
            <Stack component="li" key={`${link.label}-${link.url}`} direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Link href={link.url} target="_blank" rel="noopener noreferrer" underline="hover" noWrap>
                {link.label}
              </Link>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('shell.profile.details.noLinks')}
        </Typography>
      )}
    </Stack>
  );
}

import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import type { IntelCitation } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { ENV_LABEL_KEYS, SOURCE_LABEL_KEYS, sourceIcon } from '../../../components/sources';

/** The sources an answer actually cited — each with where it came from and which environment. */
export default function Citations({ items }: Readonly<{ items: IntelCitation[] }>) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Box component="section" aria-label={t('intel.chat.sources')} sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {t('intel.chat.sources')}
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 0.75 }}>
        {items.map((c) => {
          const where = [c.page ? t('intel.chat.page', { vars: { page: c.page } }) : '', c.line_start ? t('intel.chat.lines', { vars: { from: c.line_start, to: c.line_end ?? c.line_start } }) : ''].filter(Boolean).join(' · ');
          const internal = c.url.startsWith('/');
          return (
            <Stack key={c.ref} id={`cite-${c.ref}`} direction="row" spacing={1} sx={{ alignItems: 'flex-start', scrollMarginTop: 80 }}>
              <Chip size="small" label={c.ref} sx={{ height: 20, fontSize: '0.7rem' }} />
              <Box sx={{ color: 'text.secondary', display: 'flex', pt: 0.25 }} aria-hidden>
                {sourceIcon(c.source)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                {c.url ? (
                  <Link href={c.url} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noopener noreferrer'} variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                    {c.title}
                  </Link>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.title}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" component="p">
                  {[t(SOURCE_LABEL_KEYS[c.source] ?? 'intel.sources.MEDIA'), t(ENV_LABEL_KEYS[c.environment] ?? 'intel.env.SHARED'), where].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader, SectionCard } from '@duncit/ui';
import ClientGuides from '../../components/client-guides/ClientGuides';
import CodeBlock from '../../components/CodeBlock';
import { mcpBaseUrl } from '../../lib/mcp-url';
import { ASK_KEYS, META_PARAMS, PROMPTS, SAFETY_KEYS } from './guideContent';
import TermList from './TermList';

/** A plain bulleted list of copy keys. */
function KeyList({ keys }: Readonly<{ keys: readonly string[] }>) {
  const { t } = useTranslation();
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {keys.map((key) => (
        <Typography key={key} component="li" variant="body2" sx={{ mb: 0.75 }}>
          {t(key)}
        </Typography>
      ))}
    </Box>
  );
}

/**
 * The MCP guide — what connecting an AI app to Duncit means, the connector URL
 * pattern, setup per app, the parameters every tool takes, the ready-made
 * prompts and what to ask. Public (the OAuth metadata links here as the
 * service's documentation); `actions` is the sign-in or Connect button.
 */
export default function GuidePage({ actions }: Readonly<{ actions?: ReactNode }>) {
  const { t } = useTranslation();
  const base = mcpBaseUrl();
  const gatewayUrl = [base, 'mcp'].join('/');
  const consoleUrl = [base, `<${t('mcp.guide.consolePlaceholder')}>`, 'mcp'].join('/');

  return (
    <Stack spacing={3}>
      <PageHeader title={t('mcp.guide.title')} subtitle={t('mcp.guide.subtitle')} actions={actions} />
      <SectionCard title={t('mcp.guide.whatTitle')}>
        <Stack spacing={1}>
          <Typography variant="body2">{t('mcp.guide.whatBody')}</Typography>
          <Typography variant="body2">{t('mcp.guide.whatSameRules')}</Typography>
        </Stack>
      </SectionCard>
      <SectionCard title={t('mcp.guide.urlTitle')} subtitle={t('mcp.guide.urlBody')}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" component="p">
            {t('mcp.guide.urlGateway')}
          </Typography>
          <CodeBlock code={gatewayUrl} copyLabel={t('mcp.guide.copyGateway')} />
          <Typography variant="subtitle2" component="p">
            {t('mcp.guide.urlConsole')}
          </Typography>
          <CodeBlock code={consoleUrl} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mcp.guide.urlExact')}
          </Typography>
        </Stack>
      </SectionCard>
      <SectionCard title={t('mcp.guide.connectTitle')}>
        <ClientGuides url={gatewayUrl} />
      </SectionCard>
      <SectionCard title={t('mcp.guide.metaTitle')} subtitle={t('mcp.guide.metaBody')}>
        <TermList terms={META_PARAMS} />
      </SectionCard>
      <SectionCard title={t('mcp.guide.promptsTitle')} subtitle={t('mcp.guide.promptsBody')}>
        <TermList terms={PROMPTS} />
      </SectionCard>
      <SectionCard title={t('mcp.guide.asksTitle')}>
        <KeyList keys={ASK_KEYS} />
      </SectionCard>
      <SectionCard title={t('mcp.guide.safetyTitle')}>
        <KeyList keys={SAFETY_KEYS} />
      </SectionCard>
    </Stack>
  );
}

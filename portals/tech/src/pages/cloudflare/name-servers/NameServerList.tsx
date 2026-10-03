import { Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';

const MONO = { fontFamily: 'monospace', wordBreak: 'break-all' } as const;

interface Props {
  title: string;
  subtitle: string;
  servers: string[];
  emptyText: string;
  testId: string;
}

/** One set of nameservers — what the registrar holds, what Cloudflare assigned, or GoDaddy's own. */
export default function NameServerList({ title, subtitle, servers, emptyText, testId }: Readonly<Props>) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {servers.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={0.5} data-testid={testId}>
          {servers.map((host) => (
            <Typography key={host} variant="body2" sx={MONO}>
              {host}
            </Typography>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

import { Box, Chip, Stack, Typography } from '@mui/material';
import type { PackageDoc } from './package-docs';
import { useTranslation } from '@duncit/app-settings';

/**
 * What the docs site's frontmatter records about a package, rendered as the
 * card above its prose: the one-line summary, the guarantees it holds itself
 * to, who imports it, and what it exports.
 *
 * These four facts are the ones worth having before reading anything else —
 * "can I use this here" is usually answered by frameworkFree and consumers
 * alone.
 */
export default function PackageDocHeader({ doc }: Readonly<{ doc: PackageDoc }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {doc.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
          {doc.summary}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={doc.category} color="primary" variant="outlined" />
        {doc.zeroDeps && <Chip size="small" label={t('tech.packagesDocs.zeroRuntimeDeps')} color="success" variant="outlined" />}
        {doc.frameworkFree && (
          <Chip size="small" label="framework-free" color="info" variant="outlined" />
        )}
        {doc.coverageGate && (
          <Chip size="small" label="100% coverage gate" color="warning" variant="outlined" />
        )}
      </Stack>

      {doc.consumers.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Imported by
          </Typography>
          <Typography variant="body2">{doc.consumers.join(' · ')}</Typography>
        </Box>
      )}

      {doc.exports.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Exports
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {doc.exports.map((name) => (
              <Chip
                key={name}
                size="small"
                label={name}
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

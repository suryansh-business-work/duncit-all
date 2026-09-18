import { Box } from '@mui/material';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';

/**
 * Operator-authored HTML (policies, feeding guides, care notes) rendered read
 * only. The content comes from the store's role-gated console, the same trust
 * model mWeb uses for admin-authored intro copy.
 */
export function RichHtml({ html }: Readonly<{ html: string }>) {
  return <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: html }} />;
}

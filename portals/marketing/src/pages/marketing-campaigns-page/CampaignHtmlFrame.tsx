import { Box } from '@mui/material';

interface Props {
  html: string;
  title: string;
  placeholder: string;
  minHeight?: number;
}

const placeholderDoc = (text: string) =>
  `<div style="font-family:sans-serif;padding:24px;color:#6b7280">${text}</div>`;

/** The rendered email, sandboxed in an iframe so campaign CSS cannot reach the
 * portal. Shared by the live preview and the details dialog — one place that
 * knows how a campaign body is displayed. */
export default function CampaignHtmlFrame({
  html,
  title,
  placeholder,
  minHeight = 520,
}: Readonly<Props>) {
  return (
    <Box
      component="iframe"
      title={title}
      srcDoc={html || placeholderDoc(placeholder)}
      sx={{
        flex: 1,
        width: '100%',
        minHeight,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
      }}
    />
  );
}

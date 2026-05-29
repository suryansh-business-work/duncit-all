import { Box, Stack, Typography } from '@mui/material';

interface QrPreviewProps {
  value: string;
  caption?: string;
}

export default function QrPreview({ value, caption }: QrPreviewProps) {
  if (!value) {
    return (
      <Typography variant="caption" color="text.secondary">
        SKU / barcode will appear here once saved.
      </Typography>
    );
  }
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}`;
  return (
    <Stack alignItems="center" spacing={1}>
      <Box
        component="img"
        src={src}
        alt={`QR for ${value}`}
        sx={{ width: 160, height: 160, borderRadius: 1, border: 1, borderColor: 'divider' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        {caption ?? value}
      </Typography>
    </Stack>
  );
}

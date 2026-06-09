import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AI_DESCRIBE_PRODUCT } from './productQueries';
import type { InventoryProductFormValues } from './types';

interface AiDescribeButtonProps {
  values: InventoryProductFormValues;
  onApply: (next: { short_description: string; description: string }) => void;
  onError: (msg: string) => void;
}

export default function AiDescribeButton({ values, onApply, onError }: Readonly<AiDescribeButtonProps>) {
  const [busy, setBusy] = useState(false);
  const [describe] = useMutation(AI_DESCRIBE_PRODUCT);
  const disabled = !values.product_name.trim() || busy;

  const run = async () => {
    setBusy(true);
    try {
      const res = await describe({
        variables: {
          input: {
            product_name: values.product_name,
            brand_name: values.brand_name || null,
            product_type: values.product_type,
            short_description: values.short_description || null,
            tags: values.tags,
            tone: 'friendly, concise',
          },
        },
      });
      const raw: string = res.data?.aiDescribeInventoryProduct ?? '';
      let parsed: { short_description?: string; description?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('AI returned malformed JSON');
      }
      onApply({
        short_description: parsed.short_description ?? '',
        description: parsed.description ?? '',
      });
    } catch (err: any) {
      onError(err?.message ?? 'AI generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip
      title={
        disabled && !busy
          ? 'Add a product name first'
          : 'Generate marketing copy using AI'
      }
    >
      <span>
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          startIcon={busy ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
          disabled={disabled}
          onClick={run}
        >
          {busy ? 'Generating…' : 'Generate with AI'}
        </Button>
      </span>
    </Tooltip>
  );
}

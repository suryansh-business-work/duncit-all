import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import FlowHeadFields from './FlowHeadFields';
import { BLANK_FLOW, flowMessages, flowSchema, type FlowValues } from './e2e-flow.types';

interface Props {
  initial?: FlowValues;
  onSubmit: (values: FlowValues) => void;
}

/** Submits this form from outside it — the dialog owns the action buttons. */
export const E2E_FLOW_FORM_ID = 'e2e-flow-form';

export default function E2eFlowForm({ initial, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => flowSchema(flowMessages(t)), [t]);
  const { control, handleSubmit } = useForm<FlowValues, any, FlowValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FlowValues, any, FlowValues>,
    defaultValues: initial ?? BLANK_FLOW,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate id={E2E_FLOW_FORM_ID}>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <FlowHeadFields control={control} nameHint={t('tech.e2eFlows.flowNameHint')} />
      </Stack>
    </form>
  );
}

import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { FlowHeadFields, flowMessages } from '../e2e-flow';
import StepsField from './StepsField';
import { BLANK_SUB_FLOW, subFlowSchema, type SubFlowValues } from './e2e-sub-flow.types';

interface Props {
  initial?: SubFlowValues;
  onSubmit: (values: SubFlowValues) => void;
}

/** Submits this form from outside it — the dialog owns the action buttons. */
export const E2E_SUB_FLOW_FORM_ID = 'e2e-sub-flow-form';

export default function E2eSubFlowForm({ initial, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => subFlowSchema(flowMessages(t)), [t]);
  const { control, handleSubmit } = useForm<SubFlowValues, any, SubFlowValues>({
    resolver: zodResolver(schema) as unknown as Resolver<SubFlowValues, any, SubFlowValues>,
    defaultValues: initial ?? BLANK_SUB_FLOW,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate id={E2E_SUB_FLOW_FORM_ID}>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <FlowHeadFields control={control} nameHint={t('tech.e2eFlows.subFlowNameHint')} />
        <StepsField control={control} />
      </Stack>
    </form>
  );
}

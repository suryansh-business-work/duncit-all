import { useMemo, useState } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useDebouncedValue } from '@duncit/ui';
import { RhfOptionSelect } from '../../../../components/manual/RhfOptionSelect';
import {
  MANUAL_TEST_E2E_FLOW,
  MANUAL_TEST_E2E_FLOWS,
  type E2eFlowData,
  type E2eFlowsData,
} from '../../shared/lookup.queries';
import type { CaseDetailsValues } from './case-details.types';

interface Props {
  control: Control<CaseDetailsValues>;
  setValue: UseFormSetValue<CaseDetailsValues>;
  /** The flow the case links to now, so its name shows before any search. */
  linked: { id: string; name: string } | null;
  /** Its linked sub flow, shown while that flow's sub flows load. */
  linkedSub: { id: string; name: string } | null;
  disabled: boolean;
}

type FlowOption = { id: string; name: string };

/** Flows listed per search; the E2E Flows table's own search does the matching. */
const PAGE = { page: 1, page_size: 20 };

/** Link the case to the E2E flow (and optionally the sub flow) that automates it. */
export function E2eFlowFields({ control, setValue, linked, linkedSub, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<FlowOption | null>(linked);
  const search = useDebouncedValue(input.trim(), 250);
  const flowId = useWatch({ control, name: 'e2e_flow_id' });
  const flows = useQuery<E2eFlowsData>(MANUAL_TEST_E2E_FLOWS, { variables: { query: { ...PAGE, search: search || null } } });
  const flow = useQuery<E2eFlowData>(MANUAL_TEST_E2E_FLOW, { variables: { id: flowId }, skip: !flowId });

  const options = useMemo<FlowOption[]>(() => {
    const rows = (flows.data?.e2eFlowsTable.rows ?? []).map((row) => ({ id: row.id, name: row.name }));
    return picked && !rows.some((row) => row.id === picked.id) ? [picked, ...rows] : rows;
  }, [flows.data, picked]);
  const subFlows = useMemo(() => {
    const rows = (flow.data?.e2eFlow?.sub_flows ?? []).map((sub) => ({ value: sub.id, label: sub.name }));
    const waiting = linkedSub && flowId === linked?.id && !rows.some((row) => row.value === linkedSub.id);
    return waiting ? [{ value: linkedSub.id, label: linkedSub.name }, ...rows] : rows;
  }, [flow.data, flowId, linked, linkedSub]);
  const failed = flows.error ?? flow.error;

  return (
    <>
      <Controller
        control={control}
        name="e2e_flow_id"
        render={({ field }) => (
          <Autocomplete
            size="small"
            disabled={disabled}
            options={options}
            value={options.find((option) => option.id === field.value) ?? null}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_event, next) => {
              setPicked(next);
              field.onChange(next?.id ?? '');
              setValue('e2e_sub_flow_id', '', { shouldDirty: true });
            }}
            inputValue={input}
            onInputChange={(_event, next) => setInput(next)}
            loading={flows.loading}
            loadingText={t('testsManual.common.loading')}
            noOptionsText={t('testsManual.details.noFlows')}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                onBlur={field.onBlur}
                label={t('testsManual.field.e2eFlow')}
                error={Boolean(failed)}
                helperText={failed ? t('testsManual.details.flowsFailed') : t('testsManual.details.flowHint')}
              />
            )}
          />
        )}
      />
      <RhfOptionSelect
        control={control}
        name="e2e_sub_flow_id"
        size="small"
        label={t('testsManual.field.e2eSubFlow')}
        options={subFlows}
        emptyLabel={t('testsManual.details.wholeFlow')}
        disabled={disabled || !flowId}
      />
    </>
  );
}

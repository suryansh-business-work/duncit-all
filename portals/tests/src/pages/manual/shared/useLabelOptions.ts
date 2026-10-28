import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { MANUAL_TEST_LABELS, type LabelsData } from './lookup.queries';

const NO_LABELS: string[] = [];

/** Labels already in use that match what is being typed — for every label autocomplete. */
export function useLabelOptions() {
  const [input, setInput] = useState('');
  const search = useDebouncedValue(input.trim(), 250);
  const { data, loading, error } = useQuery<LabelsData>(MANUAL_TEST_LABELS, {
    variables: { search: search || null },
  });
  return { options: data?.manualTestLabels ?? NO_LABELS, loading, error, input, setInput };
}

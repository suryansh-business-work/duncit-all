import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from '../context';
import { buildPodPreview } from './pod-preview-model';
import PodPreviewCard from './PodPreviewCard';
import PodPreviewDetails from './PodPreviewDetails';
import PreviewPane from './PreviewPane';
import type { PodFormValues } from '../types';

/**
 * Live member-side preview of the pod being written. Rendered INSIDE the form's
 * provider, so it re-derives on every keystroke from the same values the save
 * button will submit.
 */
export default function PodPreview() {
  const data = usePodFormData();
  const { control, getValues } = useFormContext<PodFormValues>();
  // Subscribing to the whole form is the point: any field can change what the
  // card or the page shows. `getValues` then reads the complete shape, which
  // `useWatch`'s partial return type cannot promise on its own.
  useWatch({ control });
  const model = buildPodPreview(getValues(), data);

  return (
    <PreviewPane
      title="Member preview"
      hint="How this pod will look once it is live. Nothing here is saved yet."
      blocks={[
        { id: 'card', label: 'In the pod list', node: <PodPreviewCard model={model} /> },
        { id: 'details', label: 'On the pod page', node: <PodPreviewDetails model={model} /> },
      ]}
    />
  );
}

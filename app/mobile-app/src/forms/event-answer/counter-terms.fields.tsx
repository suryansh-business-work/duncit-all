import { useController, type Control } from 'react-hook-form';

import { OfferTermsInputs } from '@/components/create-pod/steps/VenueSlotStep/OfferTermsFields';

import type { CounterOfferValues } from './event-answer.types';

/** A counter offer's price terms — the same pricing option and amount inputs a host offers with. */
export function CounterTermsFields({
  control,
}: Readonly<{ control: Control<CounterOfferValues> }>) {
  const model = useController({ control, name: 'model' });
  const rate = useController({ control, name: 'rate' });
  return (
    <OfferTermsInputs
      model={model.field.value}
      rate={rate.field.value}
      onModel={model.field.onChange}
      onRate={rate.field.onChange}
      modelError={model.fieldState.error?.message}
      rateError={rate.fieldState.error?.message}
    />
  );
}

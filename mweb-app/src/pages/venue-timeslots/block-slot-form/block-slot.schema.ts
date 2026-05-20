import * as yup from 'yup';
import type { BlockSlotFormValues, BlockVenueTimeslotInput } from './block-slot.types';

export const blockSlotInitialValues: BlockSlotFormValues = {
  template_id: '',
  from: '',
  to: '',
  reason: '',
};

export const blockSlotSchema: yup.ObjectSchema<BlockSlotFormValues> = yup.object({
  template_id: yup.string().trim().default(''),
  from: yup
    .string()
    .required('From is required')
    .test('valid', 'From must be a valid date', (value) =>
      !!value && !Number.isNaN(new Date(value).getTime()),
    ),
  to: yup
    .string()
    .required('To is required')
    .test('valid', 'To must be a valid date', (value) =>
      !!value && !Number.isNaN(new Date(value).getTime()),
    )
    .test('after-from', 'To must be after From', function afterFrom(value) {
      const { from } = this.parent as BlockSlotFormValues;
      if (!value || !from) return true;
      return new Date(value) > new Date(from);
    }),
  reason: yup
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must be 500 characters or fewer')
    .required('Reason is required'),
});

export function toBlockInput(values: BlockSlotFormValues): BlockVenueTimeslotInput {
  const cast = blockSlotSchema.cast(values, { stripUnknown: true });
  return {
    template_id: cast.template_id ? cast.template_id : null,
    from: new Date(cast.from).toISOString(),
    to: new Date(cast.to).toISOString(),
    reason: cast.reason,
  };
}

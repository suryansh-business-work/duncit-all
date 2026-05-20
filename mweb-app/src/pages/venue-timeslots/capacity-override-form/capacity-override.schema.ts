import * as yup from 'yup';
import type {
  CapacityOverrideFormValues,
  CapacityOverrideInput,
} from './capacity-override.types';

export const capacityOverrideInitialValues: CapacityOverrideFormValues = {
  template_id: '',
  occurrence_date: '',
  capacity_override: '',
  is_cancelled: false,
  note: '',
};

export const capacityOverrideSchema: yup.ObjectSchema<CapacityOverrideFormValues> = yup.object({
  template_id: yup.string().trim().required('Template is required'),
  occurrence_date: yup
    .string()
    .required('Date is required')
    .test('valid', 'Date must be valid', (value) =>
      !!value && !Number.isNaN(new Date(value).getTime()),
    ),
  capacity_override: yup
    .string()
    .default('')
    .test('non-negative-int', 'Capacity must be a whole number ≥ 0', (value) => {
      if (!value) return true;
      const num = Number(value);
      return Number.isInteger(num) && num >= 0 && num <= 10000;
    }),
  is_cancelled: yup.boolean().required(),
  note: yup
    .string()
    .trim()
    .max(280, 'Note must be 280 characters or fewer')
    .default(''),
});

export function toOverrideInput(values: CapacityOverrideFormValues): CapacityOverrideInput {
  const cast = capacityOverrideSchema.cast(values, { stripUnknown: true });
  const capacity =
    cast.capacity_override === '' ? null : Number(cast.capacity_override);
  return {
    template_id: cast.template_id,
    occurrence_date: new Date(cast.occurrence_date).toISOString(),
    capacity_override: capacity,
    is_cancelled: cast.is_cancelled,
    note: cast.note,
  };
}

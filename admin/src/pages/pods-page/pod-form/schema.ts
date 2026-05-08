import * as yup from 'yup';
import type { PodForm } from '../queries';

export const podFormSchema: yup.ObjectSchema<Pick<PodForm,
  | 'pod_title'
  | 'club_id'
  | 'location_id'
  | 'zone_name'
  | 'pod_hosts_id'
  | 'pod_description'
  | 'pod_date_time'
  | 'pod_end_date_time'
  | 'pod_type'
  | 'pod_amount'
  | 'pod_occurrence'
  | 'no_of_spots'
  | 'pod_info'
  | 'pod_hashtag_text'
  | 'media_text'
  | 'payment_terms'
  | 'what_this_pod_offers'
  | 'available_perks'
  | 'place_charges'
>> = yup.object({
  pod_title: yup.string().trim().min(3, 'Title is too short').max(120).required('Title required'),
  club_id: yup.string().required('Select a club'),
  location_id: yup.string().required('Select a city'),
  zone_name: yup.string().default(''),
  pod_hosts_id: yup
    .array(yup.string().required())
    .min(1, 'Add at least one host')
    .required(),
  pod_description: yup.string().trim().min(10, 'Add a longer description').required('Description required'),
  pod_date_time: yup.string().required('Start date/time required'),
  pod_end_date_time: yup
    .string()
    .default('')
    .test('after-start', 'End must be after start', function (value) {
      if (!value) return true;
      const start = (this.parent as any).pod_date_time;
      if (!start) return true;
      return new Date(value).getTime() > new Date(start).getTime();
    }),
  pod_type: yup.string().required(),
  pod_amount: yup
    .number()
    .typeError('Amount must be a number')
    .min(0, 'Amount cannot be negative')
    .max(1999, 'Amount cannot exceed 1999')
    .required()
    .test('free-zero', 'Free pods must have amount 0', function (value) {
      const t = (this.parent as any).pod_type as string;
      if (typeof t === 'string' && t.includes('FREE')) return value === 0;
      return true;
    }),
  pod_occurrence: yup.string().required(),
  no_of_spots: yup
    .number()
    .typeError('Spots must be a number')
    .min(0)
    .max(10000)
    .required(),
  pod_info: yup.string().max(2000).default(''),
  pod_hashtag_text: yup.string().max(500).default(''),
  media_text: yup.string().default(''),
  payment_terms: yup.string().max(4000).default(''),
  what_this_pod_offers: yup
    .array(yup.string().trim().min(1).max(40).required())
    .max(20)
    .default([]),
  available_perks: yup
    .array(yup.string().trim().min(1).max(40).required())
    .max(20)
    .default([]),
  place_charges: yup
    .array(
      yup.object({
        label: yup.string().trim().min(1, 'Label required').max(80).required(),
        amount: yup
          .number()
          .typeError('Amount must be a number')
          .min(0)
          .max(100000)
          .required(),
        note: yup.string().trim().max(200).default(''),
      })
    )
    .max(10)
    .default([]),
});

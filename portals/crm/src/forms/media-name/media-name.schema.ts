/**
 * The image rename rule, shared with the Duncit CRM app through
 * @duncit/forms/schemas so both refuse the same name with the same sentence.
 */
export {
  MEDIA_NAME_MAX,
  makeMediaNameSchema as mediaNameSchema,
  type MediaNameValues as MediaNameFormValues,
} from '@duncit/forms/schemas';

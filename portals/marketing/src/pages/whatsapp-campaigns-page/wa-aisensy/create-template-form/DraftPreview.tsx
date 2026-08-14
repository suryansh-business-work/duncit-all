import { templateParamCount } from '@duncit/communication';
import type { AisensyTemplate } from '../../queries';
import TemplateSample from '../TemplateSample';
import type { CreateTemplateValues } from './create-template.types';

/** AiSensy calls it FILE; WhatsApp draws it as a DOCUMENT. TEXT declares no
 * media header at all, so it is absent here on purpose. */
const MEDIA_HEADER: Record<string, string> = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  FILE: 'DOCUMENT',
};

/**
 * The draft as the recipient's WhatsApp will draw it, live while it is typed.
 *
 * It goes through the same `TemplateSample` an approved row opens with — a
 * second preview would be a second thing that can disagree with what actually
 * arrives, which is the whole reason this screen exists.
 */
export default function DraftPreview({ values }: Readonly<{ values: CreateTemplateValues }>) {
  const mediaFormat = MEDIA_HEADER[values.type] ?? '';
  const template: AisensyTemplate = {
    id: '',
    name: values.name,
    status: '',
    category: values.category,
    language: values.language,
    body: values.body,
    param_count: templateParamCount(values.body),
    header: values.header_text,
    // A text header wins: a header line typed against a media type is still the
    // line the reader will see above the message.
    header_format: values.header_text ? 'TEXT' : mediaFormat,
    footer: values.footer_text,
    // Buttons are added in AiSensy after approval, never at submission.
    buttons: [],
  };

  return <TemplateSample template={template} />;
}

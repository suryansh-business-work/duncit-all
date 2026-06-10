import type { FormState, Level } from './queries';

export function buildMediaFromText(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
    }));
}

export function buildUpdateInput(form: FormState, media: ReturnType<typeof buildMediaFromText>) {
  return {
    name: form.name,
    icon: form.icon,
    description: form.description,
    media,
    sort_order: form.sort_order,
    is_active: form.is_active,
  };
}

export function buildCreateInput(
  form: FormState,
  level: Level,
  parentId: string | null,
  media: ReturnType<typeof buildMediaFromText>
) {
  return {
    name: form.name,
    level,
    parent_id: parentId,
    icon: form.icon,
    description: form.description,
    media,
    sort_order: form.sort_order,
  };
}

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

export function buildUpdateInput(
  form: FormState,
  media: ReturnType<typeof buildMediaFromText>,
  level?: Level
) {
  const base = {
    name: form.name,
    icon: form.icon,
    description: form.description,
    media,
    sort_order: form.sort_order,
    is_active: form.is_active,
  };
  // Co-hosting is a SUB-category concept and the server rejects it elsewhere.
  if (level !== 'SUB') return base;
  return {
    ...base,
    allow_co_hosts: form.allow_co_hosts,
    max_co_hosts: form.max_co_hosts,
  };
}

export function buildCreateInput(
  form: FormState,
  level: Level,
  parentId: string | null,
  media: ReturnType<typeof buildMediaFromText>
) {
  const base = {
    name: form.name,
    level,
    parent_id: parentId,
    icon: form.icon,
    description: form.description,
    media,
    sort_order: form.sort_order,
  };
  if (level !== 'SUB') return base;
  return {
    ...base,
    allow_co_hosts: form.allow_co_hosts,
    max_co_hosts: form.max_co_hosts,
  };
}

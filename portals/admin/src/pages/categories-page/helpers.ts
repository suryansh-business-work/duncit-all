import type { CategoryIconLayout, FormState, Level } from './queries';

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

/** Strip any Apollo `__typename` and send only the input fields the server accepts. */
function layoutField(layout: CategoryIconLayout | null) {
  if (!layout) return undefined;
  return { position: layout.position, width: layout.width, height: layout.height };
}

/**
 * Icon layout is a CATEGORY-level concept — the server rejects it on SUPER/SUB.
 * Each surface is omitted entirely when its form value is null.
 */
export function buildIconLayoutInput(form: FormState) {
  const out: {
    icon_layout_mweb?: CategoryIconLayout;
    icon_layout_native?: CategoryIconLayout;
  } = {};
  const mweb = layoutField(form.icon_layout_mweb);
  if (mweb) out.icon_layout_mweb = mweb;
  const native = layoutField(form.icon_layout_native);
  if (native) out.icon_layout_native = native;
  return out;
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
  if (level === 'SUB') {
    return {
      ...base,
      allow_co_hosts: form.allow_co_hosts,
      max_co_hosts: form.max_co_hosts,
    };
  }
  // Icon layout is a CATEGORY-only concept; the server rejects it elsewhere.
  if (level === 'CATEGORY') {
    return { ...base, ...buildIconLayoutInput(form) };
  }
  return base;
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
  if (level === 'SUB') {
    return {
      ...base,
      allow_co_hosts: form.allow_co_hosts,
      max_co_hosts: form.max_co_hosts,
    };
  }
  if (level === 'CATEGORY') {
    return { ...base, ...buildIconLayoutInput(form) };
  }
  return base;
}

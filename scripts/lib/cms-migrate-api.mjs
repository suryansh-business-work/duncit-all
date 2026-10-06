/**
 * Writes a migration plan through the CMS's own GraphQL API — the same
 * validation, permissions and change log a person in the portal goes through.
 * Every write is an upsert keyed by something stable (site key, fragment key,
 * page path, template collection, entry slug), so re-running is safe.
 */

export function createClient(url, token) {
  return async function gql(query, variables = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-client-name': 'cms-migrate' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join('; '));
    return payload.data;
  };
}

export async function login(url, email, password) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation Login($input: LoginInput!) { login(input: $input) { token } }',
      variables: { input: { email, password } },
    }),
  });
  const payload = await response.json();
  const token = payload.data?.login?.token;
  if (!token) throw new Error(`login failed: ${payload.errors?.map((e) => e.message).join('; ') ?? 'no token'}`);
  return token;
}

const SITE_FIELDS = 'id key header_fragment_id footer_fragment_id';

export async function upsertSite(gql, input) {
  const { cmsSites } = await gql(`query { cmsSites { ${SITE_FIELDS} } }`);
  const existing = cmsSites.find((s) => s.key === input.key);
  if (existing) {
    const data = await gql(`mutation($id: ID!, $input: CmsSiteInput!) { updateCmsSite(site_id: $id, input: $input) { ${SITE_FIELDS} } }`, {
      id: existing.id,
      input: { ...input, header_fragment_id: existing.header_fragment_id, footer_fragment_id: existing.footer_fragment_id },
    });
    return data.updateCmsSite;
  }
  const data = await gql(`mutation($input: CmsSiteInput!) { createCmsSite(input: $input) { ${SITE_FIELDS} } }`, { input });
  return data.createCmsSite;
}

/**
 * Editors own what they have touched: a page or component published again after
 * the migration (version > 1) or holding an unsaved draft is left alone and
 * reported, unless the run says --overwrite-edited. The migration publishes
 * once, and re-publishing identical content is a no-op, so version 1 means
 * "as migrated".
 */
const edited = (doc) => Boolean(doc && (doc.has_unpublished_changes || (doc.published?.version ?? 0) > 1));
export const skipped = [];

/** Draft the html, then publish it — the migrated site goes live as built. */
async function saveAndPublish(gql, kind, id, html) {
  const save = kind === 'page' ? 'saveCmsPageDraft(page_id: $id' : 'saveCmsFragmentDraft(fragment_id: $id';
  const publish = kind === 'page' ? 'publishCmsPage(page_id: $id)' : 'publishCmsFragment(fragment_id: $id)';
  await gql(`mutation($id: ID!, $input: CmsDraftInput!) { ${save}, input: $input) { id } }`, { id, input: { project: '', html, css: '' } });
  await gql(`mutation($id: ID!) { ${publish} { id } }`, { id });
}

export async function upsertFragment(gql, siteId, fragment, { overwriteEdited = false } = {}) {
  const { cmsFragments } = await gql('query($siteId: ID!) { cmsFragments(site_id: $siteId) { id key has_unpublished_changes published { version } } }', { siteId });
  const input = { key: fragment.key, name: fragment.name, kind: fragment.kind, category: fragment.category ?? '', description: fragment.description ?? '' };
  const existing = cmsFragments.find((f) => f.key === fragment.key);
  if (!overwriteEdited && edited(existing)) {
    skipped.push(`component ${fragment.key}`);
    return existing.id;
  }
  let id = existing?.id;
  if (!id) {
    const data = await gql('mutation($siteId: ID!, $input: CmsFragmentInput!) { createCmsFragment(site_id: $siteId, input: $input) { id } }', { siteId, input });
    id = data.createCmsFragment.id;
  }
  await saveAndPublish(gql, 'fragment', id, fragment.html);
  return id;
}

async function findPage(gql, siteId, filters) {
  const data = await gql('query($siteId: ID!, $query: TableQueryInput) { cmsPagesTable(site_id: $siteId, query: $query) { rows { id has_unpublished_changes published { version } } } }', {
    siteId,
    query: { page: 1, page_size: 1, filters },
  });
  return data.cmsPagesTable.rows[0] ?? null;
}

export async function upsertPage(gql, siteId, page, { overwriteEdited = false } = {}) {
  const input = {
    kind: page.kind,
    collection_type: page.collection ?? null,
    title: page.title.slice(0, 160),
    path: page.kind === 'PAGE' ? page.path : '',
    seo: page.seo,
    show_header: page.show_header,
    show_footer: page.show_footer,
  };
  const filters =
    page.kind === 'PAGE'
      ? [{ field: 'path', op: 'eq', value: page.path }]
      : [
          { field: 'kind', op: 'eq', value: page.kind },
          { field: 'collection_type', op: 'eq', value: page.collection },
        ];
  const existing = await findPage(gql, siteId, filters);
  if (!overwriteEdited && edited(existing)) {
    skipped.push(`page ${page.kind === 'PAGE' ? page.path : `${page.kind} ${page.collection}`}`);
    return existing.id;
  }
  let id = existing?.id;
  if (id) {
    await gql('mutation($id: ID!, $input: CmsPageInput!) { updateCmsPage(page_id: $id, input: $input) { id } }', { id, input });
  } else {
    const data = await gql('mutation($siteId: ID!, $input: CmsPageInput!) { createCmsPage(site_id: $siteId, input: $input) { id } }', { siteId, input });
    id = data.createCmsPage.id;
  }
  await saveAndPublish(gql, 'page', id, page.html);
  return id;
}

export async function upsertEntry(gql, siteId, entry) {
  const data = await gql(
    'query($siteId: ID!, $c: CmsCollection!, $query: TableQueryInput) { cmsEntriesTable(site_id: $siteId, collection_type: $c, query: $query) { rows { id slug } } }',
    { siteId, c: entry.collection_type, query: { page: 1, page_size: 5, filters: [{ field: 'slug', op: 'eq', value: entry.slug }] } }
  );
  const id = data.cmsEntriesTable.rows.find((row) => row.slug === entry.slug)?.id;
  if (id) {
    await gql('mutation($id: ID!, $input: CmsEntryInput!) { updateCmsEntry(entry_id: $id, input: $input) { id } }', { id, input: entry });
    return id;
  }
  const created = await gql('mutation($siteId: ID!, $input: CmsEntryInput!) { createCmsEntry(site_id: $siteId, input: $input) { id } }', { siteId, input: entry });
  return created.createCmsEntry.id;
}

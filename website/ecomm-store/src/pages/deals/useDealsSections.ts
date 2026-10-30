import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';

import { STORE_PAGE_SECTIONS } from '../../graphql/catalog';
import { logFailure } from '../../lib/log';

const OWN_HEADING_KINDS = new Set(['PAGE_INTRO', 'HERO_SLIDER']);

/**
 * The sections the operator arranged on the deals page. While they load, or
 * when there are none (or they fail, which is logged), the page keeps its built-in
 * hero. A PAGE_INTRO or hero slider in first place replaces that hero; the
 * intro's title then becomes the page's h1, otherwise the page needs a hidden one.
 */
export function useDealsSections() {
  const { data, error } = useQuery(STORE_PAGE_SECTIONS, { variables: { page: 'DEALS' } });
  useEffect(() => {
    if (error) logFailure('deals', 'storePageSections')(error);
  }, [error]);
  const sections = data?.storePageSections ?? [];
  const first = sections.at(0);
  const replacesHero = first ? OWN_HEADING_KINDS.has(first.kind) : false;
  const introIsTitle = first?.kind === 'PAGE_INTRO' && first.title.trim() !== '';
  return { sections, replacesHero, introIsTitle, needsHiddenTitle: replacesHero && !introIsTitle };
}

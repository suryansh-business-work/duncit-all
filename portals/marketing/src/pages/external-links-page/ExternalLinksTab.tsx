import LinkList from '../short-links-page/LinkList';

/**
 * Marketing → External Links → Links.
 *
 * The same list as Short Links, scoped to the links that leave Duncit —
 * LinkList holds the whole of it, so the two cannot drift apart (rule 40).
 */
export default function ExternalLinksTab() {
  return <LinkList variant="EXTERNAL" />;
}

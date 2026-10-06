import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack } from '@mui/material';
import { MediaPickerDialog } from '@duncit/media-picker';
import { useConfirm } from '@duncit/dialogs';
import { TAB_PARAM } from '@duncit/tabs';
import { fireAndForget, logs } from '@duncit/logs';
import { useSetBreadcrumbs, useTranslation } from '@duncit/shell';
import { CMS_PAGE_DRAFT, type CmsPageDraftData } from '../queries/pages';
import { CMS_FRAGMENT_DRAFT, CMS_FRAGMENT_OPTIONS, type CmsFragmentDraftData, type CmsFragmentOptionsData } from '../queries/fragments';
import { CMS_SITE_DESIGN, type CmsSiteDesignData } from '../queries/sites';
import { fontCss, googleFontsHref, tokensCss } from '@duncit/brand/cms-design';
import { PLACEHOLDER_CSS } from '../lib/preview';
import EditorToolbar from './EditorToolbar';
import { useEditorLabels } from './useEditorLabels';
import { useEditorSave, type EditorTarget } from './useEditorSave';
import { useGrapesEditor, type AssetRequest } from './useGrapesEditor';

/** The full-screen GrapesJS designer for one page or one fragment. */
export default function CmsEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const labels = useEditorLabels();
  const { siteId = '', target: rawTarget, docId = '' } = useParams();
  const target: EditorTarget = rawTarget === 'fragments' ? 'fragments' : 'pages';
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [assetRequest, setAssetRequest] = useState<AssetRequest | null>(null);

  const page = useQuery<CmsPageDraftData>(CMS_PAGE_DRAFT, { variables: { id: docId }, skip: target !== 'pages', fetchPolicy: 'network-only' });
  const fragment = useQuery<CmsFragmentDraftData>(CMS_FRAGMENT_DRAFT, { variables: { id: docId }, skip: target !== 'fragments', fetchPolicy: 'network-only' });
  const design = useQuery<CmsSiteDesignData>(CMS_SITE_DESIGN, { variables: { id: siteId }, fetchPolicy: 'network-only' });
  const options = useQuery<CmsFragmentOptionsData>(CMS_FRAGMENT_OPTIONS, { variables: { siteId }, fetchPolicy: 'network-only' });

  const doc = target === 'pages' ? page.data?.cmsPage : fragment.data?.cmsFragment;
  const title = (target === 'pages' ? page.data?.cmsPage?.title : fragment.data?.cmsFragment?.name) ?? '';
  const ready = Boolean(doc && design.data?.cmsSite && options.data);
  const failed = page.error || fragment.error || design.error || options.error;

  const fragments = useMemo(
    () => (options.data?.cmsFragments ?? []).filter((f) => f.kind === 'SECTION' && f.is_published).map((f) => ({ id: f.id, key: f.key, name: f.name, html: f.published.html })),
    [options.data],
  );
  const source = useMemo(() => (doc ? { project: doc.draft.project, html: doc.draft.html, css: doc.draft.css } : null), [doc]);
  const site = design.data?.cmsSite;
  const canvasCss = useMemo(() => {
    const fragmentCss = (options.data?.cmsFragments ?? []).map((f) => f.published.css).join('\n');
    const designCss = site?.design;
    return [
      designCss?.base_css ?? '',
      tokensCss(designCss?.tokens ?? []),
      fontCss(designCss?.fonts ?? []),
      site?.custom_css ?? '',
      fragmentCss,
      PLACEHOLDER_CSS,
    ].join('\n');
  }, [options.data, site]);
  const fontUrls = useMemo(
    () => [googleFontsHref(site?.design.fonts ?? []), ...(site?.design.font_urls ?? [])].filter((href): href is string => Boolean(href)),
    [site],
  );

  const grapes = useGrapesEditor({
    host,
    source: ready ? source : null,
    canvasCss,
    fontUrls,
    fonts: site?.design.fonts ?? [],
    fragments,
    labels,
    template: target === 'pages' && page.data?.cmsPage?.kind !== 'PAGE',
    selfKey: target === 'fragments' ? fragment.data?.cmsFragment?.key : undefined,
    onPickAsset: setAssetRequest,
    onOpenFragment: (fragment) => {
      openFragment(fragment.id).catch(() => navigate(`/sites/${siteId}/fragments/${fragment.id}/design`));
    },
  });
  const saver = useEditorSave(target, docId, doc?.updated_at ?? null, grapes.markSaved);
  const backTo = `/sites/${siteId}?${TAB_PARAM}=${target}`;
  useSetBreadcrumbs(title ? [{ label: title }] : null);

  // Leaving with unsaved work asks first — to go back, or into a component placed on this page.
  const confirmLeave = async () =>
    !grapes.dirty ||
    confirm({
      title: t('websiteApp.cms.editor.leaveTitle'),
      message: t('websiteApp.cms.editor.leaveText'),
      confirmLabel: t('websiteApp.cms.editor.leave'),
      destructive: true,
    });
  const openFragment = async (id: string) => {
    if (await confirmLeave()) navigate(`/sites/${siteId}/fragments/${id}/design`);
  };

  const leave = async () => {
    if (await confirmLeave()) navigate(backTo);
  };

  if (failed) return <Alert severity="error">{t('websiteApp.cms.editor.loadFailed')}</Alert>;

  return (
    <Stack spacing={1} sx={{ height: 'calc(100vh - 140px)', minHeight: 560 }}>
      <EditorToolbar
        title={title}
        dirty={grapes.dirty}
        busy={saver.busy}
        disabled={!grapes.editor}
        onBack={() => {
          leave().catch(() => navigate(backTo));
        }}
        onSave={() => {
          // Both report their own failures to the editor (useEditorSave).
          if (grapes.editor) fireAndForget(saver.save(grapes.editor), logs.portal['website-app'], 'CmsEditorPage', 'save');
        }}
        onPublish={() => {
          if (grapes.editor) fireAndForget(saver.publish(grapes.editor), logs.portal['website-app'], 'CmsEditorPage', 'publish');
        }}
      />
      {saver.conflict && <Alert severity="warning">{t('websiteApp.cms.editor.conflict')}</Alert>}
      {grapes.error && <Alert severity="error">{t('websiteApp.cms.editor.loadFailed')}</Alert>}
      {!grapes.editor && !grapes.error && <LinearProgress aria-label={t('websiteApp.cms.editor.loading')} />}
      <Box ref={setHost} data-testid="cms-editor-canvas" sx={{ flex: 1, minHeight: 0, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }} />
      <MediaPickerDialog
        open={Boolean(assetRequest)}
        onClose={() => setAssetRequest(null)}
        onPicked={(url) => {
          assetRequest?.select(url);
          setAssetRequest(null);
        }}
        folder="/website/cms"
        title={t('websiteApp.cms.editor.pickImage')}
        accept="image/*"
      />
    </Stack>
  );
}

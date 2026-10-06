import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { BlockLabels } from './editorBlocks';
import type { EditorLabels } from './editorComponents';

/**
 * Every word the canvas shows, translated once per language change. Written
 * out key by key: the translation-key gate only sees a literal t('…').
 */
export function useEditorLabels() {
  const { t } = useTranslation();
  return useMemo(() => {
    const props: Record<string, string> = {
      source: t('websiteApp.cms.editor.props.source'),
      heading: t('websiteApp.cms.editor.props.heading'),
      text: t('websiteApp.cms.editor.props.text'),
      variant: t('websiteApp.cms.editor.props.variant'),
      href: t('websiteApp.cms.editor.props.href'),
      eyebrow: t('websiteApp.cms.editor.props.eyebrow'),
      baseUrl: t('websiteApp.cms.editor.props.baseUrl'),
      headingMuted: t('websiteApp.cms.editor.props.headingMuted'),
      cta: t('websiteApp.cms.editor.props.cta'),
    };
    const components: EditorLabels = {
      block: (name) => t('websiteApp.cms.editor.live.block', { vars: { name } }),
      fragment: (name) => t('websiteApp.cms.editor.live.fragment', { vars: { name } }),
      missingFragment: (key) => t('websiteApp.cms.editor.live.missingFragment', { vars: { key } }),
      field: (name) => t('websiteApp.cms.editor.live.field', { vars: { name } }),
      list: (variant) => t('websiteApp.cms.editor.live.list', { vars: { variant } }),
      prop: (key) => props[key] ?? key,
      openFragment: t('websiteApp.cms.editor.live.openFragment'),
      defaultText: t('websiteApp.cms.editor.props.defaultText'),
    };
    const blocks: BlockLabels = {
      categories: {
        basic: t('websiteApp.cms.editor.blocks.basic'),
        layout: t('websiteApp.cms.editor.blocks.layout'),
        media: t('websiteApp.cms.editor.blocks.media'),
        duncit: t('websiteApp.cms.editor.blocks.duncit'),
        fragments: t('websiteApp.cms.editor.blocks.fragments'),
        collection: t('websiteApp.cms.editor.blocks.collection'),
      },
      names: {
        section: t('websiteApp.cms.editor.blocks.section'),
        columns2: t('websiteApp.cms.editor.blocks.columns2'),
        columns3: t('websiteApp.cms.editor.blocks.columns3'),
        heading: t('websiteApp.cms.editor.blocks.heading'),
        text: t('websiteApp.cms.editor.blocks.text'),
        button: t('websiteApp.cms.editor.blocks.button'),
        link: t('websiteApp.cms.editor.blocks.link'),
        image: t('websiteApp.cms.editor.blocks.image'),
        video: t('websiteApp.cms.editor.blocks.video'),
        divider: t('websiteApp.cms.editor.blocks.divider'),
        spacer: t('websiteApp.cms.editor.blocks.spacer'),
        list: t('websiteApp.cms.editor.blocks.list'),
        quote: t('websiteApp.cms.editor.blocks.quote'),
        newsletter: t('websiteApp.cms.editor.blocks.newsletter'),
        reelSlider: t('websiteApp.cms.editor.blocks.reelSlider'),
        earnShowcase: t('websiteApp.cms.editor.blocks.earnShowcase'),
        appDownload: t('websiteApp.cms.editor.blocks.appDownload'),
        socialLinks: t('websiteApp.cms.editor.blocks.socialLinks'),
        policyStrip: t('websiteApp.cms.editor.blocks.policyStrip'),
        entryList: t('websiteApp.cms.editor.blocks.entryList'),
        entryTitle: t('websiteApp.cms.editor.blocks.entryTitle'),
        entrySummary: t('websiteApp.cms.editor.blocks.entrySummary'),
        entryBody: t('websiteApp.cms.editor.blocks.entryBody'),
        entryCover: t('websiteApp.cms.editor.blocks.entryCover'),
        entryDate: t('websiteApp.cms.editor.blocks.entryDate'),
        entryCategory: t('websiteApp.cms.editor.blocks.entryCategory'),
        entryAuthor: t('websiteApp.cms.editor.blocks.entryAuthor'),
      },
      placeholders: {
        text: t('websiteApp.cms.editor.blocks.placeholderText'),
        heading: t('websiteApp.cms.editor.blocks.placeholderHeading'),
        button: t('websiteApp.cms.editor.blocks.placeholderButton'),
      },
    };
    const fields = [
      { id: 'title', label: blocks.names.entryTitle },
      { id: 'summary', label: blocks.names.entrySummary },
      { id: 'body_html', label: blocks.names.entryBody },
      { id: 'cover_image', label: blocks.names.entryCover },
      { id: 'published_at', label: blocks.names.entryDate },
      { id: 'category', label: blocks.names.entryCategory },
      { id: 'author_name', label: blocks.names.entryAuthor },
    ];
    return { components, blocks, fields };
  }, [t]);
}

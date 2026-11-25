import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfSelect, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { PLATFORM_LABEL } from '../copy';
import type { SocialPlatform } from '../queries';
import type { SocialPostType } from '../publish.queries';
import type { SocialPostFormValues } from './social-post.types';

const POST_TYPES: readonly SocialPostType[] = ['FEED', 'REEL', 'STORY'];

/** Each type's Localization key, written out so the translation gate sees it used. */
const POST_TYPE_LABEL: Record<SocialPostType, string> = {
  FEED: 'marketing.social.postTypeFeed',
  REEL: 'marketing.social.postTypeReel',
  STORY: 'marketing.social.postTypeStory',
};

interface Props {
  control: Control<SocialPostFormValues>;
  /** The networks the post goes to, in the order picked. */
  platforms: SocialPlatform[];
  postType: SocialPostType;
  /** Open when the post already carries a caption of its own for some network. */
  hasCaptions: boolean;
  /** Turning per-network captions off drops them, rather than sending captions no longer shown. */
  onClearCaptions: () => void;
}

/**
 * How the post shows (feed, reel or story), a caption per network when one
 * should read differently, and Instagram's first comment. Each is checked
 * against every chosen network's rules as it is typed.
 */
export default function PostOptionsFields({ control, platforms, postType, hasCaptions, onClearCaptions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [perNetwork, setPerNetwork] = useState(hasCaptions);
  const typeOptions = POST_TYPES.map((value) => ({ value, label: t(POST_TYPE_LABEL[value]) }));
  const toInstagram = platforms.includes('INSTAGRAM');
  const toggle = (checked: boolean) => {
    setPerNetwork(checked);
    if (!checked) onClearCaptions();
  };

  return (
    <Stack spacing={2} data-testid="social-post-options">
      <RhfSelect control={control} name="post_type" label={t('marketing.social.postType')} hint={t('marketing.social.postTypeHint')} options={typeOptions} />
      {platforms.length > 1 && (
        <FormControlLabel
          control={<Switch checked={perNetwork} onChange={(_event, checked) => toggle(checked)} data-testid="social-post-captions-toggle" />}
          label={t('marketing.social.captionsToggle')}
        />
      )}
      {perNetwork &&
        platforms.length > 1 &&
        platforms.map((platform) => (
          <RhfTextField
            key={platform}
            control={control}
            name={`captions.${platform}`}
            label={t('marketing.social.captionFor', { vars: { network: t(PLATFORM_LABEL[platform]) } })}
            hint={t('marketing.social.captionForHint')}
            multiline
            minRows={2}
          />
        ))}
      {toInstagram && postType !== 'STORY' && (
        <RhfTextField
          control={control}
          name="first_comment"
          label={t('marketing.social.firstComment')}
          hint={t('marketing.social.firstCommentHint')}
          multiline
          minRows={2}
        />
      )}
    </Stack>
  );
}

import { Linking } from 'react-native';
import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { socialHandleLinks, type SocialHandleKey, type SocialHandles } from '@duncit/onboarding';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  /** `onboardingIntro.social_handles` — null until the intro query answers. */
  handles: SocialHandles | null;
}

/** Keys are written out in full: the translation gate only sees literal keys.
 * `brand` names a Font Awesome brand mark; the website uses the globe. */
const PLATFORMS: Record<SocialHandleKey, { labelKey: string; brand?: string }> = {
  x_url: { labelKey: 'mweb.socialHandles.x', brand: 'x-twitter' },
  instagram_url: { labelKey: 'mweb.socialHandles.instagram', brand: 'instagram' },
  youtube_url: { labelKey: 'mweb.socialHandles.youtube', brand: 'youtube' },
  facebook_url: { labelKey: 'mweb.socialHandles.facebook', brand: 'facebook' },
  website_url: { labelKey: 'mweb.socialHandles.website' },
};

function PlatformIcon({ brand, color }: Readonly<{ brand?: string; color: string }>) {
  if (brand) return <FontAwesome6 name={brand} brand size={18} color={color} />;
  return <MaterialIcons name="language" size={20} color={color} />;
}

/**
 * "Social Media Handles" at the foot of each onboarding survey phase: Duncit's
 * links, set in Onboarding > Onboarding Intro, each with its icon. Renders
 * nothing when no link is set. mWeb twin: pages/survey-gate/SocialHandlesSection.
 */
export function SocialHandlesSection({ handles }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const links = socialHandleLinks(handles);
  if (links.length === 0) return null;

  return (
    <SurfaceCard testID="onboarding-social-handles" gap={12}>
      <Text role="heading" fontSize={16} fontWeight="600" color="$color">
        {t('mweb.socialHandles.title')}
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        {links.map((link) => (
          <XStack
            key={link.key}
            testID={`onboarding-social-${link.key}`}
            role="link"
            aria-label={t(PLATFORMS[link.key].labelKey)}
            tabIndex={0}
            onPress={() => fireAndForget(Linking.openURL(link.url))}
            minHeight={44}
            alignItems="center"
            gap={8}
            paddingHorizontal={14}
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={PRESS_STYLE.control}
          >
            <PlatformIcon brand={PLATFORMS[link.key].brand} color={color} />
            <Text fontSize={14} fontWeight="600" color="$color">
              {t(PLATFORMS[link.key].labelKey)}
            </Text>
          </XStack>
        ))}
      </XStack>
    </SurfaceCard>
  );
}

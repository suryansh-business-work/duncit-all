import { useState } from 'react';
import { Image, Modal } from 'react-native';
import { Text, YStack } from 'tamagui';

import { useBranding } from '@/hooks/useBranding';

/** Strip tags from the admin's rich-text mascot blurb for plain text. */
function stripHtml(html?: string | null): string {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The brand mascot — an admin-uploaded image (`branding.mascot_image_url`, the
 * same source mWeb's header uses). Tapping it opens a "Meet" sheet. Renders
 * nothing until a mascot image is configured.
 */
export function Mascot() {
  const { data } = useBranding();
  const branding = data?.branding;
  const url = branding?.mascot_image_url;
  const name = branding?.mascot_name || 'Duncit';
  const description = stripHtml(branding?.mascot_description_html);
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <YStack
        testID="mascot-button"
        accessibilityRole="button"
        accessibilityLabel={`Meet ${name}`}
        onPress={() => setOpen(true)}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
      >
        <Image
          testID="mascot-image"
          source={{ uri: url }}
          resizeMode="contain"
          accessibilityLabel={name}
          style={{ width: 36, height: 36 }}
        />
      </YStack>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <YStack
          testID="mascot-backdrop"
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={24}
          backgroundColor="rgba(0,0,0,0.5)"
          onPress={() => setOpen(false)}
        >
          <YStack
            testID="mascot-sheet"
            width="100%"
            maxWidth={360}
            gap={12}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            padding={20}
          >
            <Text textAlign="center" fontSize={20} fontWeight="800" color="$color">
              Meet {name}
            </Text>
            <YStack alignItems="center">
              <Image
                source={{ uri: url }}
                resizeMode="contain"
                style={{ width: 180, height: 180 }}
              />
            </YStack>
            {description ? (
              <Text textAlign="center" fontSize={14} color="$muted">
                {description}
              </Text>
            ) : null}
          </YStack>
        </YStack>
      </Modal>
    </>
  );
}

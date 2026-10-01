import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { ContentActionsMenu } from '@/components/content-report/ContentActionsMenu';
import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import type { PostDetail } from '@/hooks/usePostViewer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { sharePost } from '@/utils/share';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Share, the 3-dot button and Close sit edge to edge: the touch area grows up
 * and down only, so a tap on one can never land on its neighbour. */
const HEADER_HIT_SLOP = { top: 4, bottom: 4 } as const;

/**
 * The header row's height, which is where the menu drops from. The menu is
 * positioned against the viewer's safe-area frame, whose padding an absolute
 * child ignores — so the top inset is added to this at render.
 */
const MENU_TOP = 56;

type HeaderIcon = 'share' | 'more-vert' | 'close';

interface HeaderButtonProps {
  testID: string;
  label: string;
  icon: HeaderIcon;
  onPress: () => void;
}

function HeaderButton({ testID, label, icon, onPress }: Readonly<HeaderButtonProps>) {
  const { color } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      tabIndex={0}
      hitSlop={HEADER_HIT_SLOP}
      onPress={onPress}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={20} color={color} />
    </XStack>
  );
}

interface Props {
  /** Null while the post is loading or when it could not be found. */
  post: PostDetail | null;
  /** True for the post's own author — they get Delete, everyone else Report. */
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The post viewer's header: who posted it, Share, the 3-dot menu and Close.
 * mWeb twin: PostDialogHeader (rule 27).
 *
 * The menu holds Delete for the author and Report for everybody else. A report
 * against your own post has nobody to review it, so the two never appear
 * together. The report flow starts and ends here, so its state lives here.
 */
export function PostViewerHeader({ post, canDelete, onDelete, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const name = post?.author?.full_name ?? 'Post';

  return (
    <>
      <XStack alignItems="center" justifyContent="space-between" padding={12}>
        <Text
          role="heading"
          fontSize={16}
          fontWeight="600"
          color="$color"
          numberOfLines={1}
          flex={1}
        >
          {name}
        </Text>
        {post ? (
          <>
            <HeaderButton
              testID="post-viewer-share"
              label={t('mweb.profile.sharePost')}
              icon="share"
              onPress={() => sharePost(post.id, name)}
            />
            <HeaderButton
              testID="post-actions-menu-trigger"
              label={t('contentReport.menuLabelPost')}
              icon="more-vert"
              onPress={() => setMenuOpen((open) => !open)}
            />
          </>
        ) : null}
        <HeaderButton
          testID="post-viewer-close"
          label={t('mweb.common.close')}
          icon="close"
          onPress={onClose}
        />
      </XStack>
      {post && menuOpen ? (
        <ContentActionsMenu
          kind="POST"
          top={insets.top + MENU_TOP}
          canDelete={canDelete}
          canReport={!canDelete}
          onDelete={() => {
            setMenuOpen(false);
            onDelete();
          }}
          onReport={() => {
            setMenuOpen(false);
            setReporting(post.id);
          }}
        />
      ) : null}
      <ReportContentSheet kind="POST" postId={reporting} onClose={() => setReporting(null)} />
    </>
  );
}

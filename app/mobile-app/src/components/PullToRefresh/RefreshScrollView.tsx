import { forwardRef, useCallback, useRef, type ComponentProps } from 'react';
import type { ScrollView as RNScrollView } from 'react-native';
import { ScrollView } from 'tamagui';

import { useScreenScroll } from '@/components/ScreenScroll';
import { useScreenRefreshControl } from './useAppRefreshControl';

type Props = ComponentProps<typeof ScrollView>;

/**
 * A Tamagui `ScrollView` that carries the screen's pull-to-refresh.
 *
 * Use it for a screen's ROOT vertical scroll view — that is the surface the
 * gesture belongs to — and for a full-screen modal that stands in for a page
 * (the product and post viewers, which are also routes). Horizontal rails and
 * the dialogs and half-height sheets that float over a page keep the plain
 * Tamagui `ScrollView`: a pull there fights the sheet's own drag.
 *
 * The control stays switched off until something on the screen has registered
 * a reload (see `useRefreshRegistration`), so a screen with nothing to reload
 * has no working pull rather than a spinner that does nothing. An explicit
 * `refreshControl` prop still wins, for a surface that has to word the spinner
 * differently.
 *
 * A vertical one also joins the screen's scroll registry (`ScreenScroll`), so
 * a tab the user switches to, or a wizard's next step, opens at the top.
 */
export const RefreshScrollView = forwardRef<RNScrollView, Props>(
  function RefreshScrollView(props, ref) {
    const screenControl = useScreenRefreshControl();
    const screenScroll = useScreenScroll();
    const unregister = useRef<(() => void) | undefined>(undefined);
    const vertical = !props.horizontal;
    const attach = useCallback(
      (view: RNScrollView | null) => {
        unregister.current?.();
        unregister.current = view && vertical ? screenScroll?.register(view) : undefined;
        if (typeof ref === 'function') ref(view);
        else if (ref) ref.current = view;
      },
      [ref, screenScroll, vertical],
    );
    // A sideways pull is a swipe through a rail, never a refresh of the page.
    const refreshControl = vertical ? screenControl : undefined;
    return <ScrollView ref={attach} refreshControl={refreshControl} {...props} />;
  },
);

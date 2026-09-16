import { fireEvent, screen } from '@testing-library/react-native';

import { StatusViewerFooter } from '@/components/status/StatusViewerFooter';
import type { StatusSlide } from '@/hooks/useStatus';
import type { StoryTarget } from '@/hooks/useStoryRail';
import { renderWithProviders } from '@/utils/test-utils';

const slide: StatusSlide = {
  id: 's1',
  imageUrl: 'http://x/img.jpg',
  mediaType: 'IMAGE',
  caption: 'A caption',
  seenByMe: false,
  likedByMe: false,
  likesCount: 0,
  linkUrl: '/deal',
};

const target: StoryTarget = { kind: 'user', id: 'u1' };

const baseProps = { official: false, liked: false, likeCount: 0 };

describe('StatusViewerFooter', () => {
  it('renders nothing when no slide and no handlers are given', () => {
    renderWithProviders(<StatusViewerFooter {...baseProps} />);
    expect(screen.queryByTestId('status-official-caption')).toBeNull();
    expect(screen.queryByTestId('status-like')).toBeNull();
    expect(screen.queryByTestId('status-viewers')).toBeNull();
    expect(screen.queryByTestId('status-open-target')).toBeNull();
    expect(screen.queryByTestId('status-official-link')).toBeNull();
  });

  describe('caption', () => {
    it('hides the caption block when the slide has none', () => {
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={{ ...slide, caption: null }} />,
      );
      expect(screen.queryByText('A caption')).toBeNull();
      expect(screen.queryByTestId('status-official-caption')).toBeNull();
    });

    it('shows the caption with no testID for a personal story', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} slide={slide} official={false} />);
      expect(screen.getByText('A caption')).toBeOnTheScreen();
      expect(screen.queryByTestId('status-official-caption')).toBeNull();
    });

    it('names the caption with the official testID for a Duncit status', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} slide={slide} official />);
      expect(screen.getByTestId('status-official-caption')).toHaveTextContent('A caption');
    });
  });

  describe('like button', () => {
    it('renders only when both onToggleLike and a slide are given, and fires on press', () => {
      const onToggleLike = jest.fn();
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onToggleLike={onToggleLike} />,
      );
      fireEvent.press(screen.getByTestId('status-like'));
      expect(onToggleLike).toHaveBeenCalled();
    });

    it('stays hidden without a slide even when onToggleLike is given', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} onToggleLike={jest.fn()} />);
      expect(screen.queryByTestId('status-like')).toBeNull();
    });

    it('stays hidden without onToggleLike even when a slide is given', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} slide={slide} />);
      expect(screen.queryByTestId('status-like')).toBeNull();
    });

    it('shows the like count only while it is above zero', () => {
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onToggleLike={jest.fn()} likeCount={3} />,
      );
      expect(screen.getByTestId('status-like-count')).toHaveTextContent('3');
    });

    it('hides the like count at zero', () => {
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onToggleLike={jest.fn()} likeCount={0} />,
      );
      expect(screen.queryByTestId('status-like-count')).toBeNull();
    });

    it('labels the button "Unlike story" while liked', () => {
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onToggleLike={jest.fn()} liked />,
      );
      expect(screen.getByLabelText('Unlike story')).toBeOnTheScreen();
    });

    it('labels the button "Like story" while not liked', () => {
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onToggleLike={jest.fn()} liked={false} />,
      );
      expect(screen.getByLabelText('Like story')).toBeOnTheScreen();
    });
  });

  describe('viewers row', () => {
    it('renders only when both onViewers and a slide are given, and fires with the slide id', () => {
      const onViewers = jest.fn();
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onViewers={onViewers} />,
      );
      fireEvent.press(screen.getByTestId('status-viewers'));
      expect(onViewers).toHaveBeenCalledWith('s1');
    });

    it('stays hidden without a slide', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} onViewers={jest.fn()} />);
      expect(screen.queryByTestId('status-viewers')).toBeNull();
    });

    it('stays hidden without onViewers', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} slide={slide} />);
      expect(screen.queryByTestId('status-viewers')).toBeNull();
    });
  });

  describe('open details button', () => {
    it('renders only when both a target and onOpenTarget are given, and fires with the target', () => {
      const onOpenTarget = jest.fn();
      renderWithProviders(
        <StatusViewerFooter {...baseProps} target={target} onOpenTarget={onOpenTarget} />,
      );
      fireEvent.press(screen.getByTestId('status-open-target'));
      expect(onOpenTarget).toHaveBeenCalledWith(target);
    });

    it('stays hidden without a target', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} onOpenTarget={jest.fn()} />);
      expect(screen.queryByTestId('status-open-target')).toBeNull();
    });

    it('stays hidden without onOpenTarget', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} target={target} />);
      expect(screen.queryByTestId('status-open-target')).toBeNull();
    });
  });

  describe('see more link button', () => {
    it('renders only when the slide carries a link and onOpenLink is given, and fires with the url', () => {
      const onOpenLink = jest.fn();
      renderWithProviders(
        <StatusViewerFooter {...baseProps} slide={slide} onOpenLink={onOpenLink} />,
      );
      fireEvent.press(screen.getByTestId('status-official-link'));
      expect(onOpenLink).toHaveBeenCalledWith('/deal');
    });

    it('stays hidden without onOpenLink', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} slide={slide} />);
      expect(screen.queryByTestId('status-official-link')).toBeNull();
    });

    it('stays hidden when the slide has no link', () => {
      renderWithProviders(
        <StatusViewerFooter
          {...baseProps}
          slide={{ ...slide, linkUrl: null }}
          onOpenLink={jest.fn()}
        />,
      );
      expect(screen.queryByTestId('status-official-link')).toBeNull();
    });

    it('stays hidden without a slide at all, even with onOpenLink given', () => {
      renderWithProviders(<StatusViewerFooter {...baseProps} onOpenLink={jest.fn()} />);
      expect(screen.queryByTestId('status-official-link')).toBeNull();
    });
  });
});

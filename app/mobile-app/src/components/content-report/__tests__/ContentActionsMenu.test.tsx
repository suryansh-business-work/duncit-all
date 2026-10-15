import { fireEvent, screen } from '@testing-library/react-native';

import { ContentActionsMenu } from '@/components/content-report/ContentActionsMenu';
import { renderWithProviders } from '@/utils/test-utils';

describe('ContentActionsMenu', () => {
  it("keeps a story's own test ids and offers both actions to someone who may delete", () => {
    const onDelete = jest.fn();
    const onReport = jest.fn();
    renderWithProviders(
      <ContentActionsMenu
        kind="STORY"
        canDelete
        canReport
        onDelete={onDelete}
        onReport={onReport}
      />,
    );

    expect(screen.getByTestId('status-viewer-menu')).toHaveProp('role', 'menu');
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    fireEvent.press(screen.getByTestId('status-viewer-report'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('suffixes a post menu repeated down a feed with the post id', () => {
    const onReport = jest.fn();
    renderWithProviders(
      <ContentActionsMenu
        kind="POST"
        canDelete={false}
        canReport
        onReport={onReport}
        idSuffix="post-7"
      />,
    );

    expect(screen.getByTestId('post-actions-menu-post-7')).toBeOnTheScreen();
    expect(screen.queryByTestId('post-actions-menu-post-7-delete')).toBeNull();
    fireEvent.press(screen.getByTestId('post-actions-menu-post-7-report'));
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('draws no Delete without a handler for it, and no Report on your own post', () => {
    renderWithProviders(
      <ContentActionsMenu kind="POST" canDelete canReport={false} onReport={jest.fn()} />,
    );

    expect(screen.getByTestId('post-actions-menu')).toBeOnTheScreen();
    expect(screen.queryByTestId('post-actions-menu-delete')).toBeNull();
    expect(screen.queryByTestId('post-actions-menu-report')).toBeNull();
  });
});

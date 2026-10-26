import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { PublishPageCard, type PublishPageCardProps } from '@duncit/public-page';
import { publicPageWidget } from './publicPageWidget';

const card = { title: 'Publish your page' } as unknown as PublishPageCardProps;

describe('publicPageWidget', () => {
  it('is the one "public-page" dashboard widget: bare, measured to its content, full width', () => {
    const widget = publicPageWidget(card, 7);
    expect(widget).toMatchObject({
      id: 'public-page',
      bare: true,
      fitContent: true,
      minW: 4,
      minH: 2,
      defaultLayout: { x: 0, y: 7, w: 12, h: 4 },
    });
  });

  it('starts on the row the dashboard asks for', () => {
    expect(publicPageWidget(card, 0).defaultLayout.y).toBe(0);
    expect(publicPageWidget(card, 12).defaultLayout.y).toBe(12);
  });

  it('shows the publish card with the caller’s props', () => {
    const { content } = publicPageWidget(card, 0);
    expect(isValidElement(content)).toBe(true);
    expect(content).toMatchObject({ type: PublishPageCard, props: card });
  });
});

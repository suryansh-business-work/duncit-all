import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasControls from '../../../../src/pages/region-structure/CanvasControls';
import { flowApi, resetFlowMock } from '../../../mocks/xyflow';

vi.mock('@xyflow/react', () => import('../../../mocks/xyflow'));

const VIEWPORT_KEY = 'regional_canvas_viewport';

beforeEach(() => {
  resetFlowMock();
});

const renderControls = (fullScreen = false) => {
  const onToggleFullScreen = vi.fn();
  render(<CanvasControls fullScreen={fullScreen} onToggleFullScreen={onToggleFullScreen} />);
  return onToggleFullScreen;
};

describe('CanvasControls', () => {
  it('sits in the bottom-left corner of the canvas', () => {
    renderControls();
    expect(screen.getByTestId('flow-panel-bottom-left')).toBeInTheDocument();
  });

  it('zooms in and out, and fits the whole region', () => {
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(flowApi.zoomIn).toHaveBeenCalledWith({ duration: 200 });
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(flowApi.zoomOut).toHaveBeenCalledWith({ duration: 200 });
    fireEvent.click(screen.getByRole('button', { name: 'Fit the whole region' }));
    expect(flowApi.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });
  });

  it('forgets the saved pan and zoom on reset, then fits', () => {
    localStorage.setItem(VIEWPORT_KEY, '{"x":10,"y":20,"zoom":2}');
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Reset the view' }));
    expect(localStorage.getItem(VIEWPORT_KEY)).toBe('');
    expect(flowApi.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });
  });

  it('enters full screen', () => {
    const onToggle = renderControls(false);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('FullscreenIcon')).toBeInTheDocument();
  });

  it('offers the way back out while in full screen', () => {
    const onToggle = renderControls(true);
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('FullscreenExitIcon')).toBeInTheDocument();
  });
});

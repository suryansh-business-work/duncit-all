import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false },
  mutate: vi.fn(),
  mutation: { loading: false },
}));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: () => m.query,
    useMutation: () => [m.mutate, m.mutation],
  };
});

vi.mock('@duncit/dialogs', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const field = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/settings/pod-shop-slider/SliderMediaField', () => ({
  default: (props: Record<string, any>) => {
    field.props = props;
    return (
      <div data-testid="slider-field">
        {props.media.map((item: { url: string }) => item.url).join(',')}
      </div>
    );
  },
}));

import PodShopSliderPage from '../../src/pages/settings/PodShopSliderPage';

const serverSlide = {
  __typename: 'PodShopSliderMedia',
  url: 'a.jpg',
  type: 'IMAGE',
  order: 0,
  heading: 'Gear Up',
  subheading: null,
  cta_label: null,
  cta_url: null,
};

beforeEach(() => {
  m.query = { data: undefined, loading: false };
  m.mutate = vi.fn().mockResolvedValue({});
  m.mutation = { loading: false };
  field.props = null;
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('PodShopSliderPage', () => {
  it('shows a spinner instead of the editor while the first load is in flight', () => {
    m.query = { data: undefined, loading: true };
    render(<PodShopSliderPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('slider-field')).not.toBeInTheDocument();
  });

  it('keeps the editor visible while a background refetch runs', () => {
    m.query = { data: { branding: { pod_shop_slider: [serverSlide] } }, loading: true };
    render(<PodShopSliderPage />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('slider-field')).toHaveTextContent('a.jpg');
  });

  it('renders the page copy and an empty editor when branding has no slider', () => {
    m.query = { data: { branding: null }, loading: false };
    render(<PodShopSliderPage />);
    expect(screen.getByText('Pod Shop Slider')).toBeInTheDocument();
    expect(screen.getByText(/reorder with the arrows/i)).toBeInTheDocument();
    expect(screen.getByTestId('slider-field')).toHaveTextContent('');
    expect(field.props?.media).toEqual([]);
  });

  it('normalises the stored slides, replacing null copy with empty strings', () => {
    const bareSlide = { ...serverSlide, url: 'b.mp4', type: 'VIDEO', order: 1, heading: null };
    m.query = {
      data: { branding: { pod_shop_slider: [serverSlide, bareSlide] } },
      loading: false,
    };
    render(<PodShopSliderPage />);
    expect(field.props?.media).toEqual([
      {
        url: 'a.jpg',
        type: 'IMAGE',
        heading: 'Gear Up',
        subheading: '',
        cta_label: '',
        cta_url: '',
      },
      {
        url: 'b.mp4',
        type: 'VIDEO',
        heading: '',
        subheading: '',
        cta_label: '',
        cta_url: '',
      },
    ]);
  });

  it('saves the edited list with the array position as the order', async () => {
    m.query = { data: { branding: { pod_shop_slider: [serverSlide] } }, loading: false };
    render(<PodShopSliderPage />);
    act(() =>
      field.props?.onChange([
        { url: 'b.mp4', type: 'VIDEO' },
        { url: 'a.jpg', type: 'IMAGE', heading: 'Gear Up', subheading: 'S', cta_label: 'Shop', cta_url: '/shop' },
      ]),
    );
    expect(screen.getByTestId('slider-field')).toHaveTextContent('b.mp4,a.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'Save slider' }));
    expect(m.mutate).toHaveBeenCalledWith({
      variables: {
        input: [
          {
            url: 'b.mp4',
            type: 'VIDEO',
            order: 0,
            heading: '',
            subheading: '',
            cta_label: '',
            cta_url: '',
          },
          {
            url: 'a.jpg',
            type: 'IMAGE',
            order: 1,
            heading: 'Gear Up',
            subheading: 'S',
            cta_label: 'Shop',
            cta_url: '/shop',
          },
        ],
      },
    });
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Pod Shop slider updated'));
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('surfaces the server message when the save fails', async () => {
    m.query = { data: { branding: { pod_shop_slider: [] } }, loading: false };
    m.mutate = vi.fn().mockRejectedValue(new Error('slider is too long'));
    render(<PodShopSliderPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Save slider' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('slider is too long'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the rejection is not an Error', async () => {
    m.query = { data: { branding: { pod_shop_slider: [] } }, loading: false };
    m.mutate = vi.fn().mockRejectedValue('offline');
    render(<PodShopSliderPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Save slider' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not save the slider'));
  });

  it('disables the save button and shows progress copy while saving', () => {
    m.query = { data: { branding: { pod_shop_slider: [] } }, loading: false };
    m.mutation = { loading: true };
    render(<PodShopSliderPage />);
    expect(screen.queryByRole('button', { name: 'Save slider' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

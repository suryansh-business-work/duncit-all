import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import type { ClubEditFormValues } from '../club-edit.form';
import { ClubEditForm } from '../ClubEditForm';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('../ClubBasicFields', () => ({
  ClubBasicFields: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="basic-stub">basic</Text>;
  },
}));
jest.mock('../ClubContentFields', () => ({
  ClubContentFields: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="content-stub">content</Text>;
  },
}));
const mockMedia = jest.fn();
jest.mock('@/components/create-pod/MediaUploadField', () => ({
  MediaUploadField: (props: {
    label: string;
    folder: string;
    required?: boolean;
    value: string;
    onChange: (next: string) => void;
    error?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    mockMedia(props);
    return (
      <Pressable
        testID={`media-${props.folder}`}
        onPress={() => props.onChange('https://cdn/new.jpg')}
      >
        <Text>{`${props.label}=${props.value}`}</Text>
        {props.error ? <Text>{`error:${props.error}`}</Text> : null}
      </Pressable>
    );
  },
}));

const VALID: ClubEditFormValues = {
  club_name: 'Smash Club',
  club_description: 'We play',
  super_category_id: 's1',
  category_id: 'u1',
  location_id: 'loc1',
  locality: '',
  feature_text: 'https://cdn/a.jpg',
  moments_text: '',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: 'https://chat.whatsapp.com/group',
  announcement_link: '',
  who_we_are: ['Players'],
  what_we_do: ['Play'],
  perks: ['Tea'],
  values: ['Fun'],
  faqs: [],
};

const mount = (initialValues = VALID, busy = false, error: string | null = null) => {
  const onSubmit = jest.fn();
  renderWithProviders(
    <ClubEditForm initialValues={initialValues} busy={busy} error={error} onSubmit={onSubmit} />,
  );
  return onSubmit;
};

const save = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('club-edit-save'));
  });

beforeEach(() => jest.clearAllMocks());

describe('ClubEditForm', () => {
  it('draws the four titled sections', () => {
    mount();
    for (const title of [
      'clubForm.clubSections.basicInformation',
      'clubForm.clubSections.venuesAndCommunityLinks',
      'clubForm.clubSections.mediaAndMoments',
      'clubForm.clubSections.pageContentWhoWeArePerks',
    ]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('basic-stub')).toBeOnTheScreen();
    expect(screen.getByTestId('content-stub')).toBeOnTheScreen();
  });

  it('prefills the WhatsApp links, the announcement one being optional', () => {
    mount();
    expect(screen.getByLabelText('clubForm.linksSection.whatsappCommunityLink').props.value).toBe(
      'https://chat.whatsapp.com/community',
    );
    expect(screen.getByLabelText('clubForm.linksSection.whatsappGroupLink').props.value).toBe(
      'https://chat.whatsapp.com/group',
    );
    expect(
      screen.getByLabelText('clubForm.linksSection.whatsappAnnouncementLink').props.value,
    ).toBe('');
    expect(screen.getByText('clubForm.linksSection.whatsappAnnouncementHint')).toBeOnTheScreen();
  });

  it('draws the feature media as required and the moments as optional, each to its own folder', () => {
    mount();
    const byFolder = (folder: string) =>
      mockMedia.mock.calls.map(([props]) => props).find((props) => props.folder === folder);
    expect(byFolder('/clubs')).toMatchObject({
      label: 'clubForm.mediaSection.featureImagesAndVideos',
      required: true,
      value: 'https://cdn/a.jpg',
    });
    expect(byFolder('/clubs/moments')).toMatchObject({
      label: 'clubForm.common.clubMoments',
      value: '',
    });
    expect(byFolder('/clubs/moments').required).toBeUndefined();
  });

  it('sends the values of a complete form, with media edits included', async () => {
    const onSubmit = mount();
    fireEvent.press(screen.getByTestId('media-/clubs/moments'));
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      club_name: 'Smash Club',
      feature_text: 'https://cdn/a.jpg',
      moments_text: 'https://cdn/new.jpg',
    });
  });

  it('sends nothing and shows what is wrong when a required field is empty', async () => {
    const onSubmit = mount({ ...VALID, community_link: '', feature_text: '' });
    await save();
    expect(
      await screen.findByText('mweb.clubEdit.validation.communityLinkRequired'),
    ).toBeOnTheScreen();
    expect(screen.getByText('error:mweb.clubEdit.validation.imageRequired')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a link that is not a link', async () => {
    const onSubmit = mount();
    fireEvent.changeText(
      screen.getByLabelText('clubForm.linksSection.whatsappGroupLink'),
      'whatsapp',
    );
    await save();
    expect(await screen.findByText('mweb.clubEdit.validation.linkInvalid')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the save button with its resting label, and the saving label while busy', () => {
    mount();
    expect(screen.getByLabelText('mweb.hostManage.saveChanges')).toBeOnTheScreen();
  });

  it('shows the saving label while busy', () => {
    mount(VALID, true);
    expect(screen.getByLabelText('mweb.hostPodActions.saving')).toBeOnTheScreen();
  });

  it('shows why the last save failed', () => {
    mount(VALID, false, 'Club not found');
    expect(screen.getByTestId('club-edit-error')).toHaveTextContent('Club not found');
  });

  it('shows no error line without one', () => {
    mount();
    expect(screen.queryByTestId('club-edit-error')).toBeNull();
  });
});

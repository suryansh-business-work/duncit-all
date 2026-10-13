import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useClubPodSheets } from '@/components/club-admin/pods/useClubPodSheets';
import { graphqlRequest } from '@/services/graphql.client';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockFile = jest.fn();
let mockChange: { busy: boolean; feedback: { ok: boolean; text: string } | null };
jest.mock('@/hooks/usePodChangeRequests', () => ({
  usePodChangeRequests: () => ({
    board: { penalties: { club_admin_penalty: 7 } },
    file: mockFile,
    ...mockChange,
  }),
}));

// The sheets are stubbed to plain buttons so the hook's own wiring is what runs.
jest.mock('@/components/club-admin/pods/ClubPodActionsSheet', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native');
  const Stub = (props: Record<string, unknown>) =>
    props.pod ? (
      <>
        {[
          'onDetails',
          'onAttendance',
          'onEdit',
          'onActivity',
          'onRequestChange',
          'onDelete',
          'onClose',
        ].map((name) => (
          <P key={name} testID={`act-${name}`} onPress={props[name] as () => void}>
            <T>{name}</T>
          </P>
        ))}
      </>
    ) : null;
  return { ClubPodActionsSheet: Stub };
});
jest.mock('@/components/club-admin/pods/ClubPodActivitySheet', () => {
  const { Text: T } = jest.requireActual('react-native');
  return {
    ClubPodActivitySheet: ({ pod }: { pod: { id: string } | null }) =>
      pod ? <T testID="activity-open">{pod.id}</T> : null,
  };
});
jest.mock('@/components/change-requests/RequestChangeSheet', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native');
  return {
    RequestChangeSheet: (props: {
      open: boolean;
      penalty: number;
      attendeeCount: number;
      errorText: string | null;
      onConfirm: (reason: string) => void;
      onClose: () => void;
    }) =>
      props.open ? (
        <>
          <T testID="change-meta">{`${props.penalty}|${props.attendeeCount}|${props.errorText ?? ''}`}</T>
          <P testID="change-confirm" onPress={() => props.onConfirm('wrong club')}>
            <T>confirm</T>
          </P>
        </>
      ) : null,
  };
});
jest.mock('@/components/ConfirmDialog', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native');
  return {
    ConfirmDialog: (props: {
      open: boolean;
      message: string;
      onConfirm: () => void;
      onCancel: () => void;
    }) =>
      props.open ? (
        <>
          <T testID="delete-message">{props.message}</T>
          <P testID="delete-confirm" onPress={props.onConfirm}>
            <T>yes</T>
          </P>
          <P testID="delete-cancel" onPress={props.onCancel}>
            <T>no</T>
          </P>
        </>
      ) : null,
  };
});

const mockRequest = graphqlRequest as jest.Mock;
const pod = { id: 'pod-1', pod_title: 'Sunday Jam', seats_taken: 5 } as never;
const refetch = jest.fn();
const onDeleted = jest.fn();

function Harness() {
  const sheets = useClubPodSheets({ clubId: 'club-1', refetch, onDeleted });
  return (
    <>
      <Pressable testID="open" onPress={() => sheets.openActions(pod)}>
        <Text>open</Text>
      </Pressable>
      <Text testID="delete-error">{sheets.deleteError ?? ''}</Text>
      {sheets.sheets}
    </>
  );
}

const open = () => fireEvent.press(screen.getByTestId('open'));

beforeEach(() => {
  mockNavigate.mockReset();
  mockRequest.mockReset();
  mockFile.mockReset();
  refetch.mockReset();
  onDeleted.mockReset();
  mockChange = { busy: false, feedback: null };
});

describe('useClubPodSheets', () => {
  it('opens the club-scoped pod details and closes the actions sheet', () => {
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onDetails'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPodDetails', {
      clubId: 'club-1',
      podId: 'pod-1',
    });
    expect(screen.queryByTestId('act-onDetails')).toBeNull();
  });

  it('routes attendance and edit with the pod and club', () => {
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onAttendance'));
    expect(mockNavigate).toHaveBeenLastCalledWith('PodAttendance', { podId: 'pod-1' });
    open();
    fireEvent.press(screen.getByTestId('act-onEdit'));
    expect(mockNavigate).toHaveBeenLastCalledWith('ClubPodEdit', {
      clubId: 'club-1',
      podId: 'pod-1',
    });
  });

  it('opens the activity sheet for the pod', () => {
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onActivity'));
    expect(screen.getByTestId('activity-open').props.children).toBe('pod-1');
  });

  it('just closes the sheet without acting', () => {
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onClose'));
    expect(screen.queryByTestId('act-onClose')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('files a club change request with the reason and closes on success', async () => {
    mockFile.mockResolvedValue(true);
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onRequestChange'));
    expect(screen.getByTestId('change-meta').props.children).toBe('7|5|');
    fireEvent.press(screen.getByTestId('change-confirm'));
    await waitFor(() => expect(screen.queryByTestId('change-confirm')).toBeNull());
    expect(mockFile.mock.calls[0].slice(0, 3)).toEqual(['pod-1', 'CLUB_ADMIN', 'wrong club']);
  });

  it('keeps the change sheet open and shows the server reason when filing fails', async () => {
    mockChange = { busy: false, feedback: { ok: false, text: 'Already requested' } };
    mockFile.mockResolvedValue(false);
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onRequestChange'));
    expect(screen.getByTestId('change-meta').props.children).toBe('7|5|Already requested');
    fireEvent.press(screen.getByTestId('change-confirm'));
    await waitFor(() => expect(mockFile).toHaveBeenCalled());
    expect(screen.getByTestId('change-confirm')).toBeTruthy();
  });

  it('deletes only after confirmation, then notifies and re-reads', async () => {
    mockRequest.mockResolvedValue({ clubAdminDeletePod: true });
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onDelete'));
    expect(screen.getByTestId('delete-message').props.children).toContain('Sunday Jam');
    expect(mockRequest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockRequest.mock.calls[0][1]).toEqual({ pod_doc_id: 'pod-1' });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('delete-error').props.children).toBe('');
  });

  it('cancelling the confirmation deletes nothing', () => {
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onDelete'));
    fireEvent.press(screen.getByTestId('delete-cancel'));
    expect(screen.queryByTestId('delete-confirm')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('shows why a delete failed and does not re-read', async () => {
    mockRequest.mockRejectedValue(new Error('Pod has paid guests'));
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onDelete'));
    fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('delete-error').props.children).toBe('Pod has paid guests'),
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('falls back to the localised message for a non-Error failure', async () => {
    mockRequest.mockRejectedValue('nope');
    render(<Harness />);
    open();
    fireEvent.press(screen.getByTestId('act-onDelete'));
    fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.getByTestId('delete-error').props.children).not.toBe(''));
    expect(screen.getByTestId('delete-error').props.children).not.toBe('nope');
  });
});

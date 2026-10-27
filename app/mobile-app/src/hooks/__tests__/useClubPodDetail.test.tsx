import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  ClubAdminPodAttendeesDocument,
  ClubAdminPodDetailDocument,
  ClubAdminPodHostDocument,
} from '@/graphql/club-pod-details';
import { useClubPodDetail } from '@/hooks/useClubPodDetail';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const AUTH = { auth: true };

interface Answers {
  pod: unknown;
  attendees: unknown[];
  hosts: Record<string, unknown>;
}

const answer = ({ pod, attendees, hosts }: Answers) =>
  request.mockImplementation((doc: unknown, vars: { user_id?: string }) => {
    if (doc === ClubAdminPodDetailDocument) return Promise.resolve({ clubAdminPodForEdit: pod });
    if (doc === ClubAdminPodAttendeesDocument) {
      return Promise.resolve({ clubAdminPodAttendees: attendees });
    }
    if (doc === ClubAdminPodHostDocument) {
      return Promise.resolve({ clubAdminPodHost: hosts[vars.user_id ?? ''] ?? null });
    }
    return Promise.reject(new Error('unexpected document'));
  });

const POD = { id: 'p1', pod_hosts_id: ['u1', 'u2', 'u3'], host_names: ['Asha', 'Bo'] };
const ATTENDEES = [
  {
    user_id: 'u1',
    full_name: 'Asha Roster',
    profile_photo: 'p.jpg',
    email: 'asha@r.com',
    phone: '111',
  },
  { user_id: 'u9', full_name: 'Someone', profile_photo: null, email: null, phone: null },
];
const HOSTS = {
  u1: { email: 'asha@host.com', phone: null, host_no: 'H-1', status: 'APPROVED' },
  u3: { email: null, phone: '333', host_no: null, status: null },
};

beforeEach(() => jest.clearAllMocks());

describe('useClubPodDetail', () => {
  it('reads the pod, the roster and one host profile per host, scoped to the pod', async () => {
    answer({ pod: POD, attendees: ATTENDEES, hosts: HOSTS });
    const { result } = renderHook(() => useClubPodDetail('p1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(request).toHaveBeenCalledWith(ClubAdminPodDetailDocument, { pod_doc_id: 'p1' }, AUTH);
    expect(request).toHaveBeenCalledWith(ClubAdminPodAttendeesDocument, { pod_doc_id: 'p1' }, AUTH);
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodHostDocument,
      { pod_doc_id: 'p1', user_id: 'u1' },
      AUTH,
    );
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodHostDocument,
      { pod_doc_id: 'p1', user_id: 'u3' },
      AUTH,
    );
    expect(request).toHaveBeenCalledTimes(5);
    expect(result.current.pod).toBe(POD);
    expect(result.current.attendees).toBe(ATTENDEES);
    expect(result.current.hasError).toBe(false);
  });

  it('merges roster contact with the host profile, preferring the profile', async () => {
    answer({ pod: POD, attendees: ATTENDEES, hosts: HOSTS });
    const { result } = renderHook(() => useClubPodDetail('p1'));
    await waitFor(() => expect(result.current.hosts).toHaveLength(3));
    expect(result.current.hosts).toEqual([
      // profile email wins; profile phone is null so the roster's is used.
      {
        userId: 'u1',
        name: 'Asha Roster',
        photo: 'p.jpg',
        email: 'asha@host.com',
        phone: '111',
        hostNo: 'H-1',
        status: 'APPROVED',
      },
      // not on the roster and no profile: the pod's own host name by position.
      {
        userId: 'u2',
        name: 'Bo',
        photo: null,
        email: null,
        phone: null,
        hostNo: null,
        status: null,
      },
      // no roster row, no host name at that position: empty name; profile phone only.
      {
        userId: 'u3',
        name: '',
        photo: null,
        email: null,
        phone: '333',
        hostNo: null,
        status: null,
      },
    ]);
  });

  it('falls back to the roster email when the profile has none', async () => {
    answer({
      pod: { id: 'p1', pod_hosts_id: ['u1'], host_names: ['Asha'] },
      attendees: ATTENDEES,
      hosts: { u1: { email: null, phone: '999', host_no: 'H-2', status: 'PENDING' } },
    });
    const { result } = renderHook(() => useClubPodDetail('p1'));
    await waitFor(() => expect(result.current.hosts).toHaveLength(1));
    expect(result.current.hosts[0]).toMatchObject({
      email: 'asha@r.com',
      phone: '999',
      hostNo: 'H-2',
      status: 'PENDING',
    });
  });

  it('has no hosts and no host calls when the pod is not found', async () => {
    answer({ pod: null, attendees: [], hosts: {} });
    const { result } = renderHook(() => useClubPodDetail('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod).toBeNull();
    expect(result.current.hosts).toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('asks for nothing without a pod id', () => {
    const { result } = renderHook(() => useClubPodDetail(''));
    expect(request).not.toHaveBeenCalled();
    expect(result.current.pod).toBeNull();
    expect(result.current.hosts).toEqual([]);
  });

  it('flags an error when a read fails, and clears it on a successful refetch', async () => {
    request.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useClubPodDetail('p1'));
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.pod).toBeNull();
    answer({ pod: POD, attendees: ATTENDEES, hosts: HOSTS });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.hasError).toBe(false);
    expect(result.current.pod).toBe(POD);
  });
});

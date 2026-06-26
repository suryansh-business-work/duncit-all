import { HostRequestStatus } from '@/generated/graphql/graphql';
import { applyButtonState, type MyHostRequest } from '@/graphql/host-request';

const req = (status: HostRequestStatus): MyHostRequest => ({
  id: 'hr1',
  request_no: 'HOSTREQ-000001',
  status,
  super_category_name: 'For You',
  category_name: 'Sports',
  sub_category_name: 'Badminton',
  created_at: '2026-06-26T10:00:00.000Z',
});

describe('applyButtonState', () => {
  it('returns Apply Now (enabled) when there is no active request', () => {
    expect(applyButtonState(null)).toEqual({ label: 'Apply Now', disabled: false });
  });

  it('locks to Applied while a request is REQUESTED', () => {
    expect(applyButtonState(req(HostRequestStatus.Requested))).toEqual({
      label: 'Applied',
      disabled: true,
    });
  });

  it('locks to Applied while a request is ACKNOWLEDGED', () => {
    expect(applyButtonState(req(HostRequestStatus.Acknowledged))).toEqual({
      label: 'Applied',
      disabled: true,
    });
  });

  it('returns Apply Now once a request is terminal (APPROVED)', () => {
    expect(applyButtonState(req(HostRequestStatus.Approved))).toEqual({
      label: 'Apply Now',
      disabled: false,
    });
  });

  it('returns Apply Now once a request is terminal (REJECTED)', () => {
    expect(applyButtonState(req(HostRequestStatus.Rejected))).toEqual({
      label: 'Apply Now',
      disabled: false,
    });
  });
});

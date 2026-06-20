import { railLayout, RAIL_ITEM_PITCH } from '@/utils/explore-rail';

describe('railLayout', () => {
  it('shows everything when the height is unknown (<= 0)', () => {
    expect(railLayout(6, 0)).toEqual({ visible: 6, overflow: false });
    expect(railLayout(6, -10)).toEqual({ visible: 6, overflow: false });
  });

  it('shows all actions when they comfortably fit', () => {
    expect(railLayout(6, RAIL_ITEM_PITCH * 6)).toEqual({ visible: 6, overflow: false });
  });

  it('collapses the overflow behind More, reserving one slot for it', () => {
    // Room for 3 → show 2 inline + More.
    expect(railLayout(6, RAIL_ITEM_PITCH * 3)).toEqual({ visible: 2, overflow: true });
  });

  it('keeps at least one slot even on a tiny height', () => {
    expect(railLayout(6, 10)).toEqual({ visible: 0, overflow: true });
  });
});

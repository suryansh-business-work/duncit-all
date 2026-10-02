/** One of the venue's free slots, priced as the venue would be paid for it. */
export interface AutoPodVenueSlot {
  id: string;
  start_at: string;
  end_at: string;
  whole_day: boolean;
  space_label: string;
  capacity: number;
  price: number;
  venue_receives: number;
  venue_commission_pct: number;
  host_receives: number;
  viable: boolean;
}

export interface VenueSlotsData {
  autoPodVenueSlots: {
    window_days: number;
    expires_at: string | null;
    slots: AutoPodVenueSlot[];
  };
}

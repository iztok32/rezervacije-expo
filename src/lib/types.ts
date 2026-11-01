// Oblike odgovorov Laravel API-ja (kk-karlo-bb, routes/api.php).

export type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  // Kaj aplikacija pokaže — strežnik pravice vseeno preveri pri vsakem klicu
  permissions: {
    reservations_view: boolean;
    reservations_create: boolean;
    reservations_delete: boolean;
    purchase_view: boolean;
    // Upravljanje rezervacij (admin, učitelj)
    reserve_for_others?: boolean;
    adding_backwards?: boolean;
    // Meni »Upravljanje«
    appointments_view?: boolean;
    coupons_view_all?: boolean;
    coupon_types_view?: boolean;
    users_view?: boolean;
    settings_edit?: boolean;
  };
};

/** Član za rezervacijo v imenu drugega (GET /members). */
export type Member = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  coupon_balances: Record<string, number>;
};

export type Participant = {
  name: string;
  horse: string | null;
  is_me: boolean;
  // Samo za upravljavce (admin, učitelj)
  reservation_id?: number;
  user_id?: number;
  horse_id?: number | null;
  notes?: string | null;
  created_by?: string | null;
  can_cancel?: boolean;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type Reservation = {
  id: number;
  date: string; // Y-m-d
  notes: string | null;
  appointment: {
    id: number;
    name: string;
    start_time: string | null; // HH:mm
    end_time: string | null;
  } | null;
  horse: { id: number; name: string } | null;
  can_cancel: boolean;
  late_cancellation_requested: boolean;
};

export type OccupancySlot = {
  appointment_id: number;
  name: string;
  type: number | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  booked: number;
  available: number | null;
  is_full: boolean;
  is_mine: boolean;
  my_reservation_id: number | null;
  my_reservation: {
    id: number;
    horse: string | null;
    notes: string | null;
    can_cancel: boolean;
    late_cancellation_requested: boolean;
  } | null;
  chained_after_appointment_id: number | null;
  is_open: boolean;
  can_reserve: boolean;
  // Razlog, zakaj prijava ni mogoča (roki, termin se je začel, zaklenjena veriga)
  restriction: string | null;
  chain_free_appointment: { id: number; name: string } | null;
  participants: Participant[];
  can_reserve_for_others: boolean;
  can_add_to_waiting_list: boolean;
  can_notify?: boolean;
  horses_selectable: boolean;
  horse_ids: number[]; // prazno = vsi aktivni konji
  booked_horse_ids: number[];
  coupon_type: { id: number; name: string } | null;
  waiting_list: {
    count: number;
    entry_id: number | null;
    position: number | null;
    status: 'waiting' | 'notified' | null;
    can_join: boolean;
    // Samo admin: imena v vrsti
    entries?: { id: number; user_id: number; name: string; status: 'waiting' | 'notified'; position: number }[];
  };
};

export type OccupancyDay = {
  date: string;
  holiday: string | null;
  slots: OccupancySlot[];
};

export type OccupancyResponse = {
  start: string;
  end: string;
  days: OccupancyDay[];
  horses: { id: number; name: string }[];
  coupon_balances: Record<string, number>;
  capabilities?: {
    reserve_for_others: boolean;
    assign_horses: boolean;
    manage_waiting_list: boolean;
    adding_backwards: boolean;
    notify_day?: boolean;
    notify_channels?: NotifyChannel[];
  };
  limits: {
    min_days_in_advance: number;
    max_days_in_advance: number | null;
    cancellation_days: number | null;
  };
};

// ── Upravljanje ──────────────────────────────────────────────────────────

export type NotifyChannel = 'portal' | 'email' | 'sms';

export type AppointmentDays = {
  day_monday: boolean;
  day_tuesday: boolean;
  day_wednesday: boolean;
  day_thursday: boolean;
  day_friday: boolean;
  day_saturday: boolean;
  day_sunday: boolean;
};

export type Appointment = AppointmentDays & {
  id: number;
  name: string;
  valid_from: string | null;
  valid_to: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  type: number | null;
  chained_after_appointment_id: number | null;
  chained_next_appointment_id: number | null;
  display_order: number;
  is_active: boolean;
  horse_ids: number[];
  teacher_ids: number[];
};

export type Can = { create: boolean; edit: boolean; delete: boolean };

export type AppointmentsResponse = {
  data: Appointment[];
  horses: { id: number; name: string }[];
  teachers: { id: number; name: string }[];
  types: { id: number; name: string; horses_selectable: boolean; coupon_type_id: number | null }[];
  can: Can;
};

export type AppointmentType = {
  id: number;
  name: string;
  is_active: boolean;
  horses_selectable: boolean;
  coupon_type_id: number | null;
  display_order: number;
  deleted: boolean;
};

export type AppointmentTypesResponse = {
  data: AppointmentType[];
  coupon_types: { id: number; name: string }[];
  can: Can;
};

export type CouponEntry = {
  id: number;
  user: { id: number; name: string } | null;
  coupon_type: { id: number; name: string } | null;
  quantity: number;
  transaction_type: 'purchase' | 'usage';
  created_at: string | null;
  reservation: { id: number; date: string | null; appointment: string | null } | null;
};

export type CouponsResponse = {
  data: CouponEntry[];
  meta: { current_page: number; last_page: number; total: number };
  coupon_types: { id: number; name: string }[];
  can: { view_all: boolean; create: boolean; delete: boolean };
};

export type CouponType = { id: number; name: string; price: number; is_active: boolean; deleted: boolean };

export type CouponPackage = {
  id: number;
  coupon_type_id: number;
  coupon_type: string | null;
  name: string;
  quantity: number;
  price: number;
  is_active: boolean;
  deleted: boolean;
};

export type CouponTypesResponse = { types: CouponType[]; packages: CouponPackage[]; can: Can };

export type ReservationSettings = {
  min_days_in_advance: number;
  max_days_in_advance: number;
  cancellation_days: number;
  default_admin_ids: number[];
  admin_users: { id: number; name: string }[];
};

export type MemberDetailResponse = {
  data: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    appointment_type_ids: number[];
    coupon_balances: Record<string, number>;
    upcoming_reservations: number;
  };
  appointment_types: { id: number; name: string }[];
  coupon_types: { id: number; name: string }[];
  can: { edit: boolean; create_coupons: boolean };
};

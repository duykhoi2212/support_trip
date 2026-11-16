export type UserRole = 'USER' | 'DRIVER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'LOCKED_TEMP' | 'LOCKED_PERM';

export interface User {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  avatar_url?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// -------------------------------------------------------------
// PHƯƠNG TIỆN (VEHICLE)
// -------------------------------------------------------------
export type VehicleType = 'CAR' | 'VAN' | 'TRUCK';
export type FuelType = 'GASOLINE' | 'DIESEL' | 'ELECTRIC';
export type VehicleStatus = 'ACTIVE' | 'INACTIVE';

export interface Vehicle {
  id: string;
  driver_id: string;
  type: VehicleType;
  plate_number: string;
  brand_model?: string | null;
  color?: string | null;
  seat_count: number;
  cargo_area_m2: number;
  cargo_max_kg: number;
  fuel_type?: FuelType;
  fuel_consumption?: number;
  fuel_photo_url?: string | null;
  inspection_photo_url?: string | null;
  inspection_expiry_date?: string | null;
  photo_url: string;
  status: VehicleStatus;
  created_at: string;
}

// -------------------------------------------------------------
// CHUYẾN XE (TRIP)
// -------------------------------------------------------------
export type TripStatus = 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
  id: string;
  code: string;
  driver_id: string;
  vehicle_id: string;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  dest_name: string;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
  eta: string;
  distance_km?: number | null;
  duration_min?: number | null;
  route_polyline?: string | null;
  seats_total: number;
  cargo_area_total_m2: number;
  cargo_weight_total_kg: number;
  seats_reserved: number;
  cargo_area_reserved_m2: number;
  cargo_weight_reserved_kg: number;
  estimated_fuel_cost?: number | null;
  fuel_price?: number | null;
  pickup_distance_km?: number | null;
  dropoff_distance_km?: number | null;
  status: TripStatus;
  cancel_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  vehicle?: Vehicle;
  driver?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    phone?: string;
  };
  _count?: {
    transport_requests: number;
  };
  transport_requests?: TransportRequest[];
}

// -------------------------------------------------------------
// YÊU CẦU VẬN CHUYỂN & KIỆN HÀNG (REQUEST & PACKAGE)
// -------------------------------------------------------------
export type RequestType = 'RIDE' | 'PACKAGE';
export type RequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | 'COMPLETED';
export type RideProgress = 'NOT_PICKED_UP' | 'PICKED_UP' | 'DROPPED_OFF';
export type PackageStatus = 'AWAITING_PICKUP' | 'PICKED_UP' | 'DELIVERED';

export interface PackageItem {
  id: string;
  request_id: string;
  description: string;
  category?: string | null;
  photo_url: string;
  weight_kg: number;
  area_m2: number;
  recipient_name: string;
  recipient_phone: string;
  status: PackageStatus;
}

export interface TransportRequest {
  id: string;
  code: string;
  trip_id: string;
  user_id: string;
  type: RequestType;
  pickup_name: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_name: string;
  dropoff_lat: number;
  dropoff_lng: number;
  passenger_count?: number | null;
  ride_progress?: RideProgress | null;
  status: RequestStatus;
  shared_fuel_cost?: number | null;
  reject_reason?: string | null;
  cancel_reason?: string | null;
  fail_reason_code?: string | null;
  counts_toward_cancel_rate?: boolean;
  cancelled_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    phone?: string;
  };
  trip?: Trip;
  package_items?: PackageItem[];
}

// -------------------------------------------------------------
// THÔNG BÁO (NOTIFICATION)
// -------------------------------------------------------------
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  ref_type?: string | null;
  ref_id?: string | null;
  is_read: boolean;
  created_at: string;
}
export interface RouteStep {
  name: string;
  distance_km: number;
  duration_min: number;
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  coordinates: Array<[number, number]>;
  route_polyline: string;
  major_roads?: string[];
  steps?: RouteStep[];
}

export interface AiSearchCriteria {
  origin_name?: string;
  dest_name?: string;
  departure_date?: string;
  type?: RequestType;
  passenger_count?: number;
  explanation: string;
  is_fallback: boolean;
}

export interface AiSearchResult {
  trips: Trip[];
  extracted_criteria: AiSearchCriteria;
  is_fallback: boolean;
  explanation: string;
}

export interface DriverHistoryStats {
  total_completed_trips: number;
  total_cancelled_trips: number;
  total_passengers_served: number;
  total_packages_delivered: number;
  total_fuel_received: number;
}

export interface DriverHistoryResponse {
  trips: Trip[];
  stats: DriverHistoryStats;
}

export interface UserHistoryStats {
  total_rides: number;
  total_packages: number;
  total_fuel_shared: number;
}

export interface UserHistoryResponse {
  requests: TransportRequest[];
  stats: UserHistoryStats;
}

// -------------------------------------------------------------
// QUẢN TRỊ VIÊN (ADMIN DASHBOARD)
// -------------------------------------------------------------
export type IncidentStatus = 'NOT_RECEIVED' | 'RECEIVED' | 'PROCESSING' | 'RESOLVED';

export interface AdminViolation {
  id: string;
  week_start: string;
  confirmed_count: number;
  cancelled_count: number;
  cancel_rate: number;
  lock_type: string;
  lock_until?: string | null;
  status: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  status: AccountStatus;
  locked_until?: string | null;
  created_at: string;
  violations: AdminViolation[];
  _count: {
    trips: number;
    transport_requests: number;
    violations: number;
  };
}

export interface AdminIncident {
  id: string;
  reporter_id: string;
  trip_id?: string | null;
  request_id?: string | null;
  title: string;
  description: string;
  status: IncidentStatus;
  handled_by?: string | null;
  result_note?: string | null;
  created_at: string;
  updated_at?: string | null;
  reporter: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    role: UserRole;
    avatar_url?: string | null;
  };
  handler?: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  } | null;
  trip?: {
    id: string;
    code: string;
    origin_name: string;
    dest_name: string;
    departure_time: string;
    status: TripStatus;
  } | null;
  transport_request?: {
    id: string;
    code: string;
    type: RequestType;
    status: RequestStatus;
  } | null;
}

export interface AdminStatsOverview {
  kpi: {
    trips: {
      total: number;
      open: number;
      in_progress: number;
      completed: number;
      cancelled: number;
      cancel_rate_percent: number;
    };
    requests: {
      total: number;
      completed: number;
      cancelled: number;
    };
    impact: {
      total_passengers_served: number;
      total_shared_fuel_cost: number;
    };
    incidents: {
      total: number;
      not_received: number;
      received: number;
      processing: number;
      resolved: number;
    };
  };
  daily_breakdown: Array<{
    date: string;
    total: number;
    completed: number;
    cancelled: number;
    in_progress: number;
    passengers: number;
  }>;
  date_range: {
    from: string;
    to: string;
  };
}


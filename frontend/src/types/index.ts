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
export type VehicleType = 'MOTORBIKE' | 'CAR' | 'VAN' | 'TRUCK';
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
  reject_reason?: string | null;
  cancel_reason?: string | null;
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

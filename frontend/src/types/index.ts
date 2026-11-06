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
// BẢN ĐỒ & TUYẾN ĐƯỜNG (MAP & ROUTE)
// -------------------------------------------------------------
export interface RouteResult {
  distance_km: number;
  duration_min: number;
  coordinates: Array<[number, number]>;
  route_polyline: string;
}

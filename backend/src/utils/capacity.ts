export interface TripCapacitySnapshot {
  seats_total: number;
  cargo_area_total_m2: number;
  cargo_weight_total_kg: number;
}

export interface TripReservedCapacity {
  seats_reserved: number;
  cargo_area_reserved_m2: number;
  cargo_weight_reserved_kg: number;
}

export interface IncomingRequestCapacity {
  type: 'RIDE' | 'PACKAGE';
  passenger_count?: number;
  package_items?: Array<{
    area_m2: number;
    weight_kg: number;
  }>;
}

/**
 * Kiểm tra xem chuyến xe có đủ sức chứa để tiếp nhận thêm yêu cầu mới hay không.
 * Quy tắc:
 * - RIDE: Chỉ chiếm ghế ngồi (passenger_count), không chiếm diện tích và trọng lượng hàng.
 * - PACKAGE: Chiếm tổng diện tích và tổng trọng lượng của tất cả package_items, không chiếm ghế ngồi.
 */
export function canAcceptRequest(
  snapshot: TripCapacitySnapshot,
  reserved: TripReservedCapacity,
  incoming: IncomingRequestCapacity
): { canAccept: boolean; reason?: string } {
  if (incoming.type === 'RIDE') {
    const seatsRequested = incoming.passenger_count || 1;
    if (reserved.seats_reserved + seatsRequested > snapshot.seats_total) {
      return {
        canAccept: false,
        reason: `Hết chỗ ngồi. Còn lại ${snapshot.seats_total - reserved.seats_reserved} chỗ, yêu cầu ${seatsRequested} chỗ.`,
      };
    }
    return { canAccept: true };
  }

  if (incoming.type === 'PACKAGE') {
    const items = incoming.package_items || [];
    const totalAreaNeeded = items.reduce((sum, item) => sum + item.area_m2, 0);
    const totalWeightNeeded = items.reduce((sum, item) => sum + item.weight_kg, 0);

    const availableArea = snapshot.cargo_area_total_m2 - reserved.cargo_area_reserved_m2;
    const availableWeight = snapshot.cargo_weight_total_kg - reserved.cargo_weight_reserved_kg;

    // Làm tròn đến 4 chữ số thập phân để tránh lỗi sai số float của Javascript
    if (Math.round((reserved.cargo_area_reserved_m2 + totalAreaNeeded) * 10000) > Math.round(snapshot.cargo_area_total_m2 * 10000)) {
      return {
        canAccept: false,
        reason: `Không đủ diện tích chở hàng. Còn lại ${availableArea.toFixed(2)} m², yêu cầu ${totalAreaNeeded.toFixed(2)} m².`,
      };
    }

    if (Math.round((reserved.cargo_weight_reserved_kg + totalWeightNeeded) * 10000) > Math.round(snapshot.cargo_weight_total_kg * 10000)) {
      return {
        canAccept: false,
        reason: `Không đủ tải trọng chở hàng. Còn lại ${availableWeight.toFixed(2)} kg, yêu cầu ${totalWeightNeeded.toFixed(2)} kg.`,
      };
    }

    return { canAccept: true };
  }

  return { canAccept: false, reason: 'Loại yêu cầu không hợp lệ' };
}

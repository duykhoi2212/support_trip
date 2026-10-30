import { PrismaClient, user_role, vehicle_type, vehicle_status, trip_status } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Clean up existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.violation.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Đảm bảo Partial Unique Index luôn tồn tại
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_user_trip_request" 
    ON "transport_requests" ("trip_id", "user_id") 
    WHERE "status" IN ('PENDING', 'ACCEPTED');
  `);

  console.log('🧹 Cleaned existing tables & verified partial unique index.');

  // 2. Create 1 Admin
  const admin = await prisma.user.create({
    data: {
      phone: '0901000001',
      email: 'admin@example.com',
      password_hash: passwordHash,
      full_name: 'Quản Trị Viên Hệ Thống',
      role: user_role.ADMIN,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  // 3. Create 2 Drivers
  const driver1 = await prisma.user.create({
    data: {
      phone: '0902000001',
      email: 'driver1@example.com',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Tài (Tài Xế Hà Nội)',
      role: user_role.DRIVER,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      phone: '0902000002',
      email: 'driver2@example.com',
      password_hash: passwordHash,
      full_name: 'Trần Văn Lái (Tài Xế Xe Tải)',
      role: user_role.DRIVER,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  // 4. Create Vehicles for Drivers
  const vehicle1 = await prisma.vehicle.create({
    data: {
      driver_id: driver1.id,
      type: vehicle_type.CAR,
      plate_number: '29A-888.88',
      brand_model: 'Toyota Vios 2022',
      color: 'Trắng',
      seat_count: 4,
      cargo_area_m2: 0.8,
      cargo_max_kg: 80,
      photo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600',
      status: vehicle_status.ACTIVE,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      driver_id: driver2.id,
      type: vehicle_type.TRUCK,
      plate_number: '29C-999.99',
      brand_model: 'Hyundai Porter H150',
      color: 'Xanh dương',
      seat_count: 2,
      cargo_area_m2: 6.5,
      cargo_max_kg: 1500,
      photo_url: 'https://images.unsplash.com/photo-1586191582062-85750b2841dc?w=600',
      status: vehicle_status.ACTIVE,
    },
  });

  // 5. Create 3 Users
  const user1 = await prisma.user.create({
    data: {
      phone: '0903000001',
      email: 'user1@example.com',
      password_hash: passwordHash,
      full_name: 'Lê Thị Mai',
      role: user_role.USER,
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      phone: '0903000002',
      email: 'user2@example.com',
      password_hash: passwordHash,
      full_name: 'Phạm Quốc Hùng',
      role: user_role.USER,
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      phone: '0903000003',
      email: 'user3@example.com',
      password_hash: passwordHash,
      full_name: 'Hoàng Minh Tuấn',
      role: user_role.USER,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  // 6. Create Trips (departure >= 24h from now)
  const now = new Date();
  const departure1 = new Date(now.getTime() + 30 * 60 * 60 * 1000); // +30h
  const eta1 = new Date(departure1.getTime() + 2.5 * 60 * 60 * 1000); // +2.5h duration

  const departure2 = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h
  const eta2 = new Date(departure2.getTime() + 3.0 * 60 * 60 * 1000); // +3h duration

  const trip1 = await prisma.trip.create({
    data: {
      code: 'TRIP-' + Math.floor(100000 + Math.random() * 900000),
      driver_id: driver1.id,
      vehicle_id: vehicle1.id,
      origin_name: 'Bến xe Mỹ Đình, Nam Từ Liêm, Hà Nội',
      origin_lat: 21.0285,
      origin_lng: 105.7782,
      dest_name: 'Bến xe Thành phố Thái Bình, Thái Bình',
      dest_lat: 20.4465,
      dest_lng: 106.3366,
      departure_time: departure1,
      eta: eta1,
      distance_km: 105.5,
      duration_min: 150,
      route_polyline: 'o_~`Aev{bS~b@v_Bhv@|...sample_polyline...',
      seats_total: vehicle1.seat_count,
      cargo_area_total_m2: vehicle1.cargo_area_m2,
      cargo_weight_total_kg: vehicle1.cargo_max_kg,
      seats_reserved: 0,
      cargo_area_reserved_m2: 0,
      cargo_weight_reserved_kg: 0,
      status: trip_status.OPEN,
    },
  });

  const trip2 = await prisma.trip.create({
    data: {
      code: 'TRIP-' + Math.floor(100000 + Math.random() * 900000),
      driver_id: driver2.id,
      vehicle_id: vehicle2.id,
      origin_name: 'Cảng Hải Phòng, Ngô Quyền, Hải Phòng',
      origin_lat: 20.8651,
      origin_lng: 106.6838,
      dest_name: 'Cụm công nghiệp Nam Từ Liêm, Hà Nội',
      dest_lat: 21.0312,
      dest_lng: 105.7621,
      departure_time: departure2,
      eta: eta2,
      distance_km: 120.0,
      duration_min: 180,
      route_polyline: 'q_~`Aav{bS...sample_polyline_truck...',
      seats_total: vehicle2.seat_count,
      cargo_area_total_m2: vehicle2.cargo_area_m2,
      cargo_weight_total_kg: vehicle2.cargo_max_kg,
      seats_reserved: 0,
      cargo_area_reserved_m2: 0,
      cargo_weight_reserved_kg: 0,
      status: trip_status.OPEN,
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(`- 1 Admin: ${admin.email} (Mật khẩu: Password@123)`);
  console.log(`- 2 Drivers: ${driver1.email}, ${driver2.email} (Mật khẩu: Password@123)`);
  console.log(`- 2 Vehicles: ${vehicle1.plate_number}, ${vehicle2.plate_number}`);
  console.log(`- 3 Users: ${user1.email}, ${user2.email}, ${user3.email} (Mật khẩu: Password@123)`);
  console.log(`- 2 Trips: ${trip1.code}, ${trip2.code}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

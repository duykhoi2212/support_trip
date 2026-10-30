-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'LOCKED_TEMP', 'LOCKED_PERM');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('MOTORBIKE', 'CAR', 'VAN', 'TRUCK');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('OPEN', 'CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('RIDE', 'PACKAGE');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ride_progress" AS ENUM ('NOT_PICKED_UP', 'PICKED_UP', 'DROPPED_OFF');

-- CreateEnum
CREATE TYPE "package_status" AS ENUM ('AWAITING_PICKUP', 'PICKED_UP', 'DELIVERED');

-- CreateEnum
CREATE TYPE "fail_reason_code" AS ENUM ('WRONG_INFO', 'UNREACHABLE', 'ABSENT', 'OTHER');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('USER', 'DRIVER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "lock_type" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateEnum
CREATE TYPE "violation_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "incident_status" AS ENUM ('NOT_RECEIVED', 'RECEIVED', 'PROCESSING', 'RESOLVED');

-- CreateTable users
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(255),
    "role" "user_role" NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "locked_until" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable vehicles
CREATE TABLE "vehicles" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "type" "vehicle_type" NOT NULL,
    "plate_number" VARCHAR(20) NOT NULL,
    "brand_model" VARCHAR(100),
    "color" VARCHAR(30),
    "seat_count" INTEGER NOT NULL,
    "cargo_area_m2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cargo_max_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photo_url" VARCHAR(255) NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable trips
CREATE TABLE "trips" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "driver_id" BIGINT NOT NULL,
    "vehicle_id" BIGINT NOT NULL,
    "origin_name" VARCHAR(255) NOT NULL,
    "origin_lat" DOUBLE PRECISION NOT NULL,
    "origin_lng" DOUBLE PRECISION NOT NULL,
    "dest_name" VARCHAR(255) NOT NULL,
    "dest_lat" DOUBLE PRECISION NOT NULL,
    "dest_lng" DOUBLE PRECISION NOT NULL,
    "departure_time" TIMESTAMP(6) NOT NULL,
    "eta" TIMESTAMP(6) NOT NULL,
    "distance_km" DOUBLE PRECISION,
    "duration_min" INTEGER,
    "route_polyline" TEXT,
    "seats_total" INTEGER NOT NULL,
    "cargo_area_total_m2" DOUBLE PRECISION NOT NULL,
    "cargo_weight_total_kg" DOUBLE PRECISION NOT NULL,
    "seats_reserved" INTEGER NOT NULL DEFAULT 0,
    "cargo_area_reserved_m2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cargo_weight_reserved_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "trip_status" NOT NULL DEFAULT 'OPEN',
    "cancel_reason" VARCHAR(255),
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable transport_requests
CREATE TABLE "transport_requests" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "request_type" NOT NULL,
    "pickup_name" VARCHAR(255) NOT NULL,
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "dropoff_name" VARCHAR(255) NOT NULL,
    "dropoff_lat" DOUBLE PRECISION NOT NULL,
    "dropoff_lng" DOUBLE PRECISION NOT NULL,
    "passenger_count" INTEGER,
    "ride_progress" "ride_progress",
    "status" "request_status" NOT NULL DEFAULT 'PENDING',
    "reject_reason" VARCHAR(255),
    "cancel_reason" VARCHAR(255),
    "cancelled_by" "actor_type",
    "fail_reason_code" "fail_reason_code",
    "counts_toward_cancel_rate" BOOLEAN NOT NULL DEFAULT false,
    "decided_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable package_items
CREATE TABLE "package_items" (
    "id" BIGSERIAL NOT NULL,
    "request_id" BIGINT NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50),
    "photo_url" VARCHAR(255) NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "area_m2" DOUBLE PRECISION NOT NULL,
    "recipient_name" VARCHAR(100) NOT NULL,
    "recipient_phone" VARCHAR(15) NOT NULL,
    "status" "package_status" NOT NULL DEFAULT 'AWAITING_PICKUP',

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable violations
CREATE TABLE "violations" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "week_start" DATE NOT NULL,
    "confirmed_count" INTEGER NOT NULL,
    "cancelled_count" INTEGER NOT NULL,
    "cancel_rate" DOUBLE PRECISION NOT NULL,
    "lock_type" "lock_type" NOT NULL,
    "lock_until" TIMESTAMP(6),
    "status" "violation_status" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(6),
    "revoked_by" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable incident_reports
CREATE TABLE "incident_reports" (
    "id" BIGSERIAL NOT NULL,
    "reporter_id" BIGINT NOT NULL,
    "trip_id" BIGINT,
    "request_id" BIGINT,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "incident_status" NOT NULL DEFAULT 'NOT_RECEIVED',
    "handled_by" BIGINT,
    "result_note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "ref_type" VARCHAR(30),
    "ref_id" BIGINT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" BIGINT,
    "actor_type" "actor_type" NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "target_type" VARCHAR(30),
    "target_id" BIGINT,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "vehicles_type_plate_number_key" ON "vehicles"("type", "plate_number");
CREATE UNIQUE INDEX "trips_code_key" ON "trips"("code");
CREATE INDEX "trips_vehicle_id_departure_time_eta_idx" ON "trips"("vehicle_id", "departure_time", "eta");
CREATE INDEX "trips_status_departure_time_idx" ON "trips"("status", "departure_time");
CREATE UNIQUE INDEX "transport_requests_code_key" ON "transport_requests"("code");
CREATE INDEX "transport_requests_trip_id_status_idx" ON "transport_requests"("trip_id", "status");
CREATE INDEX "transport_requests_user_id_status_idx" ON "transport_requests"("user_id", "status");
CREATE UNIQUE INDEX "violations_user_id_week_start_key" ON "violations"("user_id", "week_start");

-- Partial Unique Index (Ràng buộc mỗi user chỉ có 1 yêu cầu PENDING hoặc ACCEPTED trên mỗi chuyến)
CREATE UNIQUE INDEX "unique_active_user_trip_request" 
ON "transport_requests" ("trip_id", "user_id") 
WHERE "status" IN ('PENDING', 'ACCEPTED');

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "violations" ADD CONSTRAINT "violations_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "transport_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

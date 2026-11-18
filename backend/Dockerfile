# ==============================================================
# Stage 1: Build TypeScript & Generate Prisma Client
# ==============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt công cụ cần thiết để biên dịch native addon (bcrypt) & OpenSSL cho Prisma
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ==============================================================
# Stage 2: Production Runtime Image
# ==============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh

# Cài đặt openssl cho Prisma Client và tzdata để đảm bảo múi giờ Việt Nam
RUN apk add --no-cache openssl tzdata wget

COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt chỉ production dependencies (cần build tools tạm cho bcrypt nếu không có prebuild)
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && npx prisma generate \
  && apk del .build-deps

COPY --from=builder /app/dist ./dist

# Tạo sẵn thư mục lưu trữ file upload (avatar, ảnh xe, ảnh kiện hàng)
RUN mkdir -p /app/uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Chạy prisma migrate deploy trước khi khởi động máy chủ (an toàn cho production)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

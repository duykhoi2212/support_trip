# ==============================================================
# Stage 1: Build React + Vite Production Assets
# ==============================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==============================================================
# Stage 2: Serve SPA & Reverse Proxy with Nginx
# ==============================================================
FROM nginx:1.27-alpine AS runner

# Xóa cấu hình mặc định và nạp cấu hình tối ưu cho GoX SPA + Reverse Proxy
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

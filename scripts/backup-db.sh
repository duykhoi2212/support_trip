#!/usr/bin/env bash
# ============================================================
# Script tự động sao lưu CSDL PostgreSQL (GoX Platform)
# Cài đặt chạy hàng ngày lúc 02:00 sáng trên VPS bằng Crontab:
#   0 2 * * * /opt/gox/scripts/backup-db.sh >> /var/log/gox-backup.log 2>&1
# ============================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/gox/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-gox-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-gox_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/gox_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Bắt đầu sao lưu CSDL ${DB_NAME} từ container ${CONTAINER_NAME}..."
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[$(date -Iseconds)] Đã lưu bản sao lưu thành công tại: ${BACKUP_FILE}"

# Tự động xóa các bản sao lưu cũ hơn RETENTION_DAYS ngày để tiết kiệm ổ cứng VPS
find "${BACKUP_DIR}" -type f -name "gox_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date -Iseconds)] Đã dọn dẹp các bản sao lưu cũ hơn ${RETENTION_DAYS} ngày."

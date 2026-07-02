#!/bin/bash
# Backup Opteer PostgreSQL Database
# Usage: ./backup_db.sh

set -e

# Configuration
CONTAINER_NAME="opteer-db-1" # Update if your docker-compose project name differs
DB_USER="postgres"
DB_NAME="opteer"
BACKUP_DIR="$(pwd)/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/opteer_db_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."
echo "Container: ${CONTAINER_NAME}"
echo "Database: ${DB_NAME}"

# Execute pg_dump inside the container and compress it
docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} -c -O | gzip > "${BACKUP_FILE}"

echo "Backup completed successfully!"
echo "Saved to: ${BACKUP_FILE}"

# Optional: Keep only the last 7 days of backups
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
echo "Cleaned up backups older than 7 days."

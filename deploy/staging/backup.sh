#!/bin/sh
set -eu

stack_dir=/opt/webtoonhub-staging
backup_dir="$stack_dir/backups"
stamp=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

docker compose -f "$stack_dir/compose.yml" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/db-$stamp.dump"
docker compose -f "$stack_dir/compose.yml" exec -T api tar -C /app/public_content -czf - . > "$backup_dir/content-$stamp.tar.gz"

chmod 600 "$backup_dir/db-$stamp.dump" "$backup_dir/content-$stamp.tar.gz"
find "$backup_dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'content-*.tar.gz' \) -mtime +7 -delete

#!/bin/sh
set -eu
umask 077

stack_dir=${BACKUP_STACK_DIR:-/opt/webtoonhub-staging}
backup_dir="$stack_dir/backups"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
# Both the timer and release script enter this same critical section.
exec 9>"$backup_dir/.backup.lock"
if command -v flock >/dev/null 2>&1; then
    flock -n 9 || { echo 'Another backup owns the snapshot lock; retry after it finishes' >&2; exit 75; }
else
    echo 'flock is required to safely serialize backups' >&2
    exit 2
fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)-$$

db_backup="$backup_dir/db-$stamp.dump"
media_backup="$backup_dir/content-$stamp.tar.gz"
imports_backup="$backup_dir/imports-$stamp.tar.gz"
manifest="$backup_dir/manifest-$stamp.sha256"
api_paused=0
cleanup() {
    task_status=$?
    trap - EXIT
    if [ "$api_paused" = 1 ]; then
        if ! docker compose -f "$stack_dir/compose.yml" unpause api >/dev/null; then
            echo 'API could not be resumed after backup; run docker compose unpause api immediately' >&2
            task_status=1
        fi
    fi
    rm -f "$db_backup.partial" "$media_backup.partial" "$imports_backup.partial" "$manifest.partial"
    exit "$task_status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
# Keep database references and both file stores from the same quiet API state.
# Helpers share the named volumes; docker exec cannot run in a paused container.
api_container=$(docker compose -f "$stack_dir/compose.yml" ps -q api)
[ -n "$api_container" ] || { echo 'API container was not found; snapshot aborted' >&2; exit 1; }
if [ "$(docker inspect -f '{{.State.Paused}}' "$api_container")" = true ]; then
    echo 'API was already paused; snapshot aborted without taking pause ownership' >&2
    exit 75
fi
docker compose -f "$stack_dir/compose.yml" pause api >/dev/null
api_paused=1
docker compose -f "$stack_dir/compose.yml" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$db_backup.partial"
docker compose -f "$stack_dir/compose.yml" run --rm --no-deps -T --entrypoint tar api -C /app/public_content -czf - . > "$media_backup.partial"
docker compose -f "$stack_dir/compose.yml" run --rm --no-deps -T --entrypoint tar api -C /app/private_chapter_imports -czf - . > "$imports_backup.partial"
docker compose -f "$stack_dir/compose.yml" unpause api >/dev/null
api_paused=0
# Validate all formats without restoring or changing the running database/media.
docker compose -f "$stack_dir/compose.yml" exec -T db pg_restore --list < "$db_backup.partial" >/dev/null
gzip -t "$media_backup.partial"
gzip -t "$imports_backup.partial"
mv "$db_backup.partial" "$db_backup"
mv "$media_backup.partial" "$media_backup"
mv "$imports_backup.partial" "$imports_backup"
(cd "$backup_dir" && sha256sum "db-$stamp.dump" "content-$stamp.tar.gz" "imports-$stamp.tar.gz") > "$manifest.partial"
mv "$manifest.partial" "$manifest"

chmod 600 "$db_backup" "$media_backup" "$imports_backup" "$manifest"
printf '%s\n' "$stamp" > "$backup_dir/latest-local-success"
# Offsite storage is configured independently through the systemd environment file.
# Credentials must be provided by the host AWS credential chain, never command arguments.
if [ -n "${BACKUP_S3_URI:-}" ]; then
    case "$BACKUP_S3_URI" in s3://*) ;; *) echo 'BACKUP_S3_URI must be an s3:// location' >&2; exit 2 ;; esac
    command -v aws >/dev/null || { echo 'AWS CLI is required for offsite backups' >&2; exit 1; }
    aws s3 cp "$db_backup" "${BACKUP_S3_URI%/}/db-$stamp.dump" --only-show-errors
    aws s3 cp "$media_backup" "${BACKUP_S3_URI%/}/content-$stamp.tar.gz" --only-show-errors
    aws s3 cp "$imports_backup" "${BACKUP_S3_URI%/}/imports-$stamp.tar.gz" --only-show-errors
    aws s3 cp "$manifest" "${BACKUP_S3_URI%/}/manifest-$stamp.sha256" --only-show-errors
    printf '%s\n' "$stamp" > "$backup_dir/latest-offsite-success"
else
    echo 'Offsite backup is unconfigured; only the local recovery copy was created' >&2
fi
printf '%s\n' "$stamp" > "$backup_dir/latest-success"

find "$backup_dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'content-*.tar.gz' -o -name 'imports-*.tar.gz' -o -name 'manifest-*.sha256' \) -mtime +7 -delete

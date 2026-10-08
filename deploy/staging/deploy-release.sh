#!/bin/sh
set -eu

stack_dir=/opt/webtoonhub-staging
sha=${1:-}
case "$sha" in
    *[!0-9a-f]*|'') exit 2 ;;
esac
[ "${#sha}" -eq 40 ] || exit 2

exec 9>"$stack_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }

cd "$stack_dir"
docker image inspect "webtoonhub-staging-api:$sha" "webtoonhub-staging-web:$sha" >/dev/null

# A database migration can run at API startup. Capture the database and uploads first.
"$stack_dir/backup.sh"
cp "$stack_dir/backups/latest-success" "$stack_dir/last-release-backup"

docker tag webtoonhub-staging-api:local webtoonhub-staging-api:previous
docker tag webtoonhub-staging-web:local webtoonhub-staging-web:previous

rollback() {
    echo 'Release failed; restoring the previous application images' >&2
    echo "Database schema is unchanged by image rollback. Recovery backup: $(cat "$stack_dir/last-release-backup")" >&2
    docker tag webtoonhub-staging-api:previous webtoonhub-staging-api:local
    docker tag webtoonhub-staging-web:previous webtoonhub-staging-web:local
    docker compose -f "$stack_dir/compose.yml" up -d --no-build --pull never --no-deps --force-recreate api || true
    docker compose -f "$stack_dir/compose.yml" up -d --no-build --pull never --no-deps --force-recreate web || true
}
trap rollback EXIT

docker tag "webtoonhub-staging-api:$sha" webtoonhub-staging-api:local
docker tag "webtoonhub-staging-web:$sha" webtoonhub-staging-web:local
docker compose -f "$stack_dir/compose.yml" up -d --no-build --pull never --no-deps --force-recreate api

attempt=0
while [ "$attempt" -lt 30 ]; do
    if [ "$(docker inspect -f '{{.State.Health.Status}}' webtoonhub-staging-api-1 2>/dev/null)" = healthy ]; then
        break
    fi
    attempt=$((attempt + 1))
    sleep 5
done
[ "$attempt" -lt 30 ] || { docker compose -f "$stack_dir/compose.yml" logs --tail=80 api; exit 1; }

docker compose -f "$stack_dir/compose.yml" up -d --no-build --pull never --no-deps --force-recreate web
wait_http() {
    url=$1
    attempt=0
    while [ "$attempt" -lt 30 ]; do
        if curl --max-time 5 -fsS -o /dev/null "$url" 2>/dev/null; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    echo "HTTP check failed: $url" >&2
    return 1
}
wait_http http://127.0.0.1:18082/api/v1/health
wait_http http://127.0.0.1:18080/
wait_http http://127.0.0.1:18081/

printf '%s\n' "$sha" > "$stack_dir/deployed-sha"
trap - EXIT
echo "Deployed $sha"

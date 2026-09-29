#!/bin/sh
set -eu

# This is the forced command for the GitHub Actions deploy key.
case "${SSH_ORIGINAL_COMMAND:-}" in
    load\ [0-9a-f]*)
        sha=${SSH_ORIGINAL_COMMAND#load }
        ;;
    release\ [0-9a-f]*)
        sha=${SSH_ORIGINAL_COMMAND#release }
        ;;
    *)
        echo 'Unsupported deploy command' >&2
        exit 2
        ;;
esac

case "$sha" in
    *[!0-9a-f]*|'') exit 2 ;;
esac
[ "${#sha}" -eq 40 ] || exit 2

case "$SSH_ORIGINAL_COMMAND" in
    load\ *)
        gzip -dc | docker load
        docker image inspect "webtoonhub-staging-api:$sha" "webtoonhub-staging-web:$sha" >/dev/null
        ;;
    release\ *)
        exec /opt/webtoonhub-staging/deploy-release.sh "$sha"
        ;;
esac

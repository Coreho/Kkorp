#!/usr/bin/env bash
# Back up the editor's file store (TASK-022). Interim: TASK-017 replaces this
# job when content moves to Supabase.
#
#   backup-content.sh           take a snapshot, then prune old ones
#   backup-content.sh --check   exit 1 unless the newest snapshot is recent
#
# A snapshot is a tar.gz of content.json, admin-auth.json and uploads/, with a
# .sha256 file beside it. content.json is copied before uploads/: the editor
# only ever adds upload files, so every image the copied content references
# is already there when uploads/ is copied. The snapshot is refused if it is
# not, rather than saved incomplete.
set -euo pipefail
umask 077

source_dir=${CONTENT_DIR:-/var/lib/koreokorp-content}
backup_dir=${BACKUP_DIR:-$HOME/backups/koreokorp-content}
keep_daily=${KEEP_DAILY:-14}
keep_weekly=${KEEP_WEEKLY:-8}
max_age_hours=${MAX_AGE_HOURS:-26}
name_pattern='^koreokorp-content-[0-9]{8}T[0-9]{6}Z\.tar\.gz$'

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

newest() {
  ls -1 "$backup_dir/daily" 2>/dev/null | grep -E "$name_pattern" | sort | tail -n 1 || true
}

check() {
  local latest age
  latest=$(newest)
  if [ -z "$latest" ]; then
    log "FAIL no backup in $backup_dir/daily"
    return 1
  fi
  age=$(( ($(date +%s) - $(stat -c %Y "$backup_dir/daily/$latest")) / 3600 ))
  if [ "$age" -ge "$max_age_hours" ]; then
    log "FAIL newest backup $latest is ${age}h old"
    return 1
  fi
  log "OK newest backup $latest is ${age}h old"
}

# Fails if content.json does not parse or references an upload that is missing.
verify() {
  node -e '
    const { existsSync, readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const dir = process.argv[1];
    const file = join(dir, "content.json");
    if (!existsSync(file)) process.exit(0);
    const content = JSON.parse(readFileSync(file, "utf8"));
    const missing = [];
    for (const kind of ["posts", "projects"]) {
      for (const entry of content[kind] || []) {
        if (entry.image && !existsSync(join(dir, entry.image))) missing.push(entry.image);
      }
    }
    if (missing.length) {
      console.error(`missing uploads: ${missing.join(", ")}`);
      process.exit(1);
    }
  ' "$1"
}

prune() {
  local dir=$1 keep=$2 pattern=$3
  ls -1 "$dir" | grep -E "$pattern" | sort -r | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f "$dir/$old" "$dir/$old.sha256"
  done
}

snapshot() {
  if [ ! -d "$source_dir" ]; then
    log "FAIL content directory $source_dir is missing"
    return 1
  fi
  mkdir -p "$backup_dir/daily" "$backup_dir/weekly"
  if command -v flock >/dev/null; then
    exec 9>"$backup_dir/.lock"
    if ! flock -n 9; then
      log "FAIL another backup is running"
      return 1
    fi
  fi

  local stamp archive week weekly uploads
  stamp=${BACKUP_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
  archive="koreokorp-content-$stamp.tar.gz"
  work=$(mktemp -d "$backup_dir/.work-XXXXXX")
  trap 'rm -rf "$work"' EXIT

  mkdir -p "$work/snapshot/uploads"
  for file in content.json admin-auth.json; do
    if [ -f "$source_dir/$file" ]; then cp -p "$source_dir/$file" "$work/snapshot/$file"; fi
  done
  if [ -d "$source_dir/uploads" ]; then cp -pR "$source_dir/uploads/." "$work/snapshot/uploads/"; fi
  if ! verify "$work/snapshot"; then
    log "FAIL snapshot $archive is inconsistent; nothing was saved"
    return 1
  fi

  tar -C "$work/snapshot" -czf "$work/$archive" .
  (cd "$work" && sha256sum "$archive" > "$archive.sha256")
  mv "$work/$archive" "$backup_dir/daily/$archive"
  mv "$work/$archive.sha256" "$backup_dir/daily/$archive.sha256"
  printf '%s\n' "$archive" > "$work/latest"
  mv "$work/latest" "$backup_dir/latest"

  # The first snapshot of each ISO week is also kept as that week's copy.
  week=$(date -u -d "${stamp:0:8}" +%G-W%V)
  weekly="koreokorp-content-weekly-$week.tar.gz"
  if [ ! -f "$backup_dir/weekly/$weekly" ]; then
    cp -p "$backup_dir/daily/$archive" "$backup_dir/weekly/$weekly"
    (cd "$backup_dir/weekly" && sha256sum "$weekly" > "$weekly.sha256")
  fi

  prune "$backup_dir/daily" "$keep_daily" "$name_pattern"
  prune "$backup_dir/weekly" "$keep_weekly" '^koreokorp-content-weekly-[0-9]{4}-W[0-9]{2}\.tar\.gz$'
  uploads=$(find "$work/snapshot/uploads" -type f | wc -l)
  log "OK saved $archive ($uploads uploads, $(stat -c %s "$backup_dir/daily/$archive") bytes)"
}

case "${1:-}" in
  --check) check ;;
  '') snapshot ;;
  *) echo "usage: $0 [--check]" >&2; exit 2 ;;
esac

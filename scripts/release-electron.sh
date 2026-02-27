#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/release-electron.sh [tag] [options]

If no tag is provided, an interactive prompt asks whether to:
- overwrite current release (v<current-version>), or
- bump to a higher version and release that.

Options:
  --build-all         Run Electron builds for mac, win, linux before upload.
  --draft             Create release as draft (new release only).
  --prerelease        Mark release as prerelease (new release only).
  --title <title>     Custom release title (default: tag).
  --notes <text>      Release notes text (default: "Electron release <tag>").
  --notes-file <path> Read release notes from file.
  --help              Show this help.

Examples:
  ./scripts/release-electron.sh
  ./scripts/release-electron.sh v0.1.0 --build-all --draft
  ./scripts/release-electron.sh --build-all
EOF
}

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

get_package_version() {
  node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).version)"
}

get_cargo_version() {
  awk '
    /^\[package\]/ { in_package=1; next }
    /^\[/ && in_package { in_package=0 }
    in_package && $1=="version" {
      gsub(/"/, "", $3)
      print $3
      exit
    }
  ' src-tauri/Cargo.toml
}

compute_bumped_version() {
  local current="$1"
  local kind="$2"
  node - "$current" "$kind" <<'NODE'
const current = process.argv[2];
const kind = process.argv[3];
const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  console.error(`Invalid semver version: ${current}`);
  process.exit(1);
}
let major = Number(match[1]);
let minor = Number(match[2]);
let patch = Number(match[3]);
if (kind === "patch") {
  patch += 1;
} else if (kind === "minor") {
  minor += 1;
  patch = 0;
} else if (kind === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else {
  console.error(`Unknown bump kind: ${kind}`);
  process.exit(1);
}
console.log(`${major}.${minor}.${patch}`);
NODE
}

is_valid_semver() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

prompt_yes_no() {
  local question="$1"
  local default_answer="${2:-y}" # y|n
  local prompt="[y/N]"
  if [[ "$default_answer" == "y" ]]; then
    prompt="[Y/n]"
  fi
  while true; do
    read -r -p "$question $prompt " reply
    reply="${reply:-$default_answer}"
    local reply_lc
    reply_lc="$(printf '%s' "$reply" | tr '[:upper:]' '[:lower:]')"
    case "$reply_lc" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) echo "Please answer y or n." ;;
    esac
  done
}

update_versions_to() {
  local new_version="$1"
  echo "==> Updating package.json/package-lock.json to ${new_version}"
  npm version "$new_version" --no-git-tag-version >/dev/null

  echo "==> Updating src-tauri/Cargo.toml to ${new_version}"
  python3 - "$new_version" <<'PY'
import re
import sys
from pathlib import Path

new_version = sys.argv[1]
path = Path("src-tauri/Cargo.toml")
text = path.read_text(encoding="utf-8")

pattern = re.compile(r"(\[package\][\s\S]*?\nversion = \")([^\"]+)(\")", re.M)
updated, count = pattern.subn(r"\g<1>" + new_version + r"\3", text, count=1)
if count != 1:
  raise SystemExit("Failed to update [package] version in src-tauri/Cargo.toml")
path.write_text(updated, encoding="utf-8")
PY
}

tag=""
if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "${1:-}" != "" && "${1:0:1}" != "-" ]]; then
  tag="$1"
  shift
fi

build_all=0
is_draft=0
is_prerelease=0
title=""
notes=""
notes_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-all)
      build_all=1
      shift
      ;;
    --draft)
      is_draft=1
      shift
      ;;
    --prerelease)
      is_prerelease=1
      shift
      ;;
    --title)
      title="${2:-}"
      shift 2
      ;;
    --notes)
      notes="${2:-}"
      shift 2
      ;;
    --notes-file)
      notes_file="${2:-}"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required. Install it first." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated." >&2
  echo "Run: gh auth login" >&2
  echo "Or set GH_TOKEN in your environment." >&2
  exit 1
fi

current_pkg_version="$(get_package_version)"
current_cargo_version="$(get_cargo_version)"
current_tag="v${current_pkg_version}"

echo "Current package.json version: ${current_pkg_version}"
echo "Current Cargo.toml version:  ${current_cargo_version}"

if [[ -z "$tag" ]]; then
  if [[ ! -t 0 ]]; then
    echo "No tag provided and no interactive terminal available." >&2
    echo "Provide a tag explicitly, e.g. ./scripts/release-electron.sh v${current_pkg_version}" >&2
    exit 1
  fi

  release_exists_label="no"
  if gh release view "$current_tag" >/dev/null 2>&1; then
    release_exists_label="yes"
  fi
  echo "Release ${current_tag} exists on GitHub: ${release_exists_label}"
  echo
  echo "Select release mode:"
  echo "  1) Overwrite/upload current release (${current_tag})"
  echo "  2) Bump PATCH and release"
  echo "  3) Bump MINOR and release"
  echo "  4) Bump MAJOR and release"
  echo "  5) Enter custom higher version"
  echo "  q) Abort"

  while true; do
    read -r -p "Choice [1/2/3/4/5/q]: " choice
    choice_lc="$(printf '%s' "$choice" | tr '[:upper:]' '[:lower:]')"
    case "$choice_lc" in
      1)
        tag="$current_tag"
        break
        ;;
      2|3|4)
        bump_kind="patch"
        [[ "$choice" == "3" ]] && bump_kind="minor"
        [[ "$choice" == "4" ]] && bump_kind="major"
        next_version="$(compute_bumped_version "$current_pkg_version" "$bump_kind")"
        echo "Selected new version: ${next_version}"
        if prompt_yes_no "Apply version bump to ${next_version}?" "y"; then
          update_versions_to "$next_version"
          tag="v${next_version}"
          current_pkg_version="$next_version"
        else
          echo "Aborted."
          exit 1
        fi
        break
        ;;
      5)
        read -r -p "Enter custom version (x.y.z): " custom_version
        if ! is_valid_semver "$custom_version"; then
          echo "Invalid version format. Expected x.y.z"
          continue
        fi
        if [[ "$custom_version" == "$current_pkg_version" ]]; then
          echo "Custom version equals current version; using overwrite mode."
          tag="v${custom_version}"
          break
        fi
        if prompt_yes_no "Apply version bump to ${custom_version}?" "y"; then
          update_versions_to "$custom_version"
          tag="v${custom_version}"
          current_pkg_version="$custom_version"
          break
        else
          echo "Aborted."
          exit 1
        fi
        ;;
      q)
        echo "Aborted."
        exit 0
        ;;
      *)
        echo "Invalid choice."
        ;;
    esac
  done
fi

if [[ "$build_all" -eq 1 ]]; then
  declare -a failed_targets=()
  for target in mac win linux; do
    echo "==> Building Electron target: $target"
    if ! npm run "electron:build:$target"; then
      failed_targets+=("$target")
      echo "!! Build failed for target: $target"
    fi
  done
  if [[ "${#failed_targets[@]}" -gt 0 ]]; then
    echo "Warning: some targets failed: ${failed_targets[*]}"
    echo "Continuing with available artifacts in dist-electron/."
  fi
fi

if [[ ! -d dist-electron ]]; then
  echo "dist-electron/ not found. Run an Electron build first." >&2
  exit 1
fi

declare -a assets=()
while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  case "$base" in
    builder-debug.yml|builder-effective-config.yaml)
      continue
      ;;
  esac
  assets+=("$file")
done < <(find dist-electron -maxdepth 1 -type f -print0 | sort -z)

if [[ "${#assets[@]}" -eq 0 ]]; then
  echo "No release assets found in dist-electron/." >&2
  exit 1
fi

if [[ -z "$title" ]]; then
  title="$tag"
fi
if [[ -z "$notes" && -z "$notes_file" ]]; then
  notes="Electron release $tag"
fi

if gh release view "$tag" >/dev/null 2>&1; then
  if [[ -t 0 ]]; then
    if ! prompt_yes_no "Release $tag already exists. Overwrite uploaded assets?" "y"; then
      echo "Aborted."
      exit 1
    fi
  fi
  echo "==> Release $tag exists, uploading assets (clobber)."
  gh release upload "$tag" "${assets[@]}" --clobber
else
  echo "==> Creating release $tag."
  create_args=("$tag" "${assets[@]}" --title "$title")
  if [[ -n "$notes_file" ]]; then
    create_args+=(--notes-file "$notes_file")
  else
    create_args+=(--notes "$notes")
  fi
  if [[ "$is_draft" -eq 1 ]]; then
    create_args+=(--draft)
  fi
  if [[ "$is_prerelease" -eq 1 ]]; then
    create_args+=(--prerelease)
  fi
  gh release create "${create_args[@]}"
fi

echo "Done. Uploaded ${#assets[@]} asset(s) to release $tag."
echo "If version was bumped, commit and push updated version files before tagging workflows."

#!/usr/bin/env sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(CDPATH= cd -- "$script_dir/../.." && pwd)"
dist_dir="$project_root/frontend-dist"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cp "$project_root/index.html" "$dist_dir/index.html"
cp -R "$project_root/css" "$dist_dir/css"
cp -R "$project_root/scripts" "$dist_dir/scripts"
cp -R "$project_root/metaModels" "$dist_dir/metaModels"

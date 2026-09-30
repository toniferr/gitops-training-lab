#!/bin/sh
# Assembles the GitHub Pages site from every training branch.
#
#   <out>/index.html, assets/   portal, taken from main
#   <out>/trainings.json        one entry per training branch that has a site/
#   <out>/<slug>/               site/ of branch training/<slug>
#   <out>/main/                 site/ of main (preview of material in progress)
#
# It reads remote-tracking refs, not the working tree, so every edition is
# built exactly as it was pushed. Run `git fetch origin` first when using it
# locally, then preview with: python3 -m http.server 8000 -d _site
#
# Usage: sh scripts/site/build-pages.sh [out-dir]   (default: _site)
set -eu

out="${1:-_site}"
remote="${REMOTE:-origin}"
main_ref="$remote/main"

has_site() {
  git cat-file -e "$1:site/content/training.json" 2>/dev/null
}

# extract <ref> <dir>: copies site/ from <ref> into <dir>.
extract() {
  mkdir -p "$2"
  git archive --format=tar "$1" site | tar -x --strip-components=1 -C "$2"
}

# build_info <ref> <branch>: prints the JSON the page shows in its footer.
build_info() {
  printf '{"branch":"%s","commit":"%s","date":"%s"}' \
    "$2" "$(git rev-parse --short "$1")" "$(git log -1 --format=%cI "$1")"
}

if ! has_site "$main_ref"; then
  echo "error: $main_ref has no site/content/training.json (did you run 'git fetch $remote'?)" >&2
  exit 1
fi

rm -rf "$out"
mkdir -p "$out"

extract "$main_ref" "$out/main"
build_info "$main_ref" main > "$out/main/build.json"
cp "$out/main/portal.html" "$out/index.html"
cp -R "$out/main/assets" "$out/assets"
echo "built main -> main/ (+ portal)"

entries=""
for ref in $(git for-each-ref --format='%(refname:short)' "refs/remotes/$remote/training/"); do
  branch=${ref#"$remote/"}
  slug=${branch#training/}
  # The slug becomes a URL path and is written into JSON unescaped: accept only a safe charset.
  case "$slug" in
    ''|*[!a-z0-9._-]*|.*)
      echo "skipped $branch: branch name must match training/[a-z0-9._-]+"
      continue
      ;;
  esac
  if ! has_site "$ref"; then
    echo "skipped $branch: no site/"
    continue
  fi
  extract "$ref" "$out/$slug"
  rm -f "$out/$slug/portal.html"
  info=$(build_info "$ref" "$branch")
  printf '%s\n' "$info" > "$out/$slug/build.json"
  entries="$entries${entries:+,}{\"path\":\"$slug/\",\"build\":$info,\"training\":$(cat "$out/$slug/content/training.json")}"
  echo "built $branch -> $slug/"
done

printf '{"generated":"%s","trainings":[%s]}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$entries" > "$out/trainings.json"

#!/usr/bin/env bash
# Encode screen recordings → compact animated GIFs for GitHub README.
#
# Usage:
#   bash scripts/encode-readme-gifs.sh
#   bash scripts/encode-readme-gifs.sh /path/to/raw-mp4-folder
#
# Default sources: ~/Downloads
# Writes only *.gif into docs/screenshots/videos/

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/docs/screenshots/videos"
SRC_DIR="${1:-${HOME}/Downloads}"
WIDTH="${README_GIF_WIDTH:-640}"
FPS="${README_GIF_FPS:-8}"
MAX_COLORS="${README_GIF_COLORS:-128}"
WARN_KB="${README_GIF_WARN_KB:-2048}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FAIL: ffmpeg is required (brew install ffmpeg)"
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "FAIL: source directory not found: $SRC_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

clip_opts() {
  case "$1" in
    dashboard-overview.gif) echo "560:7:96" ;;
    *) echo "${WIDTH}:${FPS}:${MAX_COLORS}" ;;
  esac
}

encode_one() {
  local src="$1"
  local dest="$2"
  local base opts w rest f c tmp_pal kb
  base="$(basename "$dest")"
  opts="$(clip_opts "$base")"
  w="${opts%%:*}"
  rest="${opts#*:}"
  f="${rest%%:*}"
  c="${rest##*:}"
  tmp_pal="${OUT_DIR}/.palette-${base%.gif}.png"

  echo "→ $(basename "$src")  →  ${base}  (${w}px @ ${f}fps, ${c} colors)"

  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "fps=${f},scale=${w}:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=${c}" \
    "$tmp_pal"

  ffmpeg -y -hide_banner -loglevel error -i "$src" -i "$tmp_pal" \
    -lavfi "fps=${f},scale=${w}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    -loop 0 \
    "$dest"

  rm -f "$tmp_pal"

  kb=$(( $(wc -c <"$dest") / 1024 ))
  if [ "$kb" -gt "$WARN_KB" ]; then
    echo "  WARN: ${kb} KB > ${WARN_KB} KB"
  else
    echo "  OK: ${kb} KB"
  fi
}

missing=0
for pair in \
  "DashboardCRM.mp4:dashboard-overview.gif" \
  "InvoicingCRM.mp4:invoicing-workflow.gif" \
  "DrBillingVidCrm.mp4:doctors-billing.gif" \
  "StrippingCRM_V1.mp4:stripping-v1.gif" \
  "StrippingCRM_V2.mp4:stripping-v2.gif"
do
  src_name="${pair%%:*}"
  gif_name="${pair##*:}"
  src_path="${SRC_DIR}/${src_name}"
  dest_path="${OUT_DIR}/${gif_name}"

  if [ ! -f "$src_path" ]; then
    echo "SKIP: missing source $src_path"
    missing=$((missing + 1))
    continue
  fi
  encode_one "$src_path" "$dest_path"
done

find "$OUT_DIR" -maxdepth 1 \( -name '*.mp4' -o -name '*.png' -o -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' \) -type f -delete 2>/dev/null || true

echo ""
ls -lh "$OUT_DIR"/*.gif

if [ "$missing" -gt 0 ]; then
  exit 1
fi

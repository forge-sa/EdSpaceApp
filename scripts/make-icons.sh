#!/usr/bin/env bash
# Regenerates the app icon, Android adaptive icon layers, splash mark and
# favicon from the EdSpace favicon design (green tile, cream "Ed", ribbon).
# Needs ImageMagick 7 (`magick`). Run from the project root.
set -euo pipefail

GREEN='#00963F'
INK='#EAFAC9'
FONT=node_modules/@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf
OUT=assets/images

# "Ed" plus the hanging ribbon on a canvas of the given size and background.
# Args: out size bg fill pointsize text-y-offset ribbon-x ribbon-w ribbon-h
glyph() {
  local out=$1 size=$2 bg=$3 fill=$4 pt=$5 dy=$6 rx=$7 rw=$8 rh=$9
  local notch=$((rh * 80 / 100))
  magick -size "${size}x${size}" "xc:${bg}" \
    -font "$FONT" -pointsize "$pt" -kerning "-$((pt / 22))" -fill "$fill" \
    -gravity center -annotate "+0+${dy}" 'Ed' \
    -gravity northwest -fill "$fill" \
    -draw "polygon ${rx},0 $((rx + rw)),0 $((rx + rw)),${rh} $((rx + rw / 2)),${notch} ${rx},${rh}" \
    -depth 8 "$out"
}

# iOS / store icon: full-bleed (the OS rounds the corners). Ribbon kept clear of the corner mask.
glyph "$OUT/icon.png" 1024 "$GREEN" "$INK" 470 30 630 140 300
magick "$OUT/icon.png" -alpha off -depth 8 "PNG24:$OUT/icon.png"

# Android adaptive icon: foreground inside the 66% safe zone, ribbon hanging from the top.
glyph "$OUT/android-icon-foreground.png" 1024 none "$INK" 300 44 604 88 360
glyph "$OUT/android-icon-monochrome.png" 1024 none white 300 44 604 88 360

# Splash mark and favicon: the rounded green tile.
tile() {
  local out=$1 size=$2
  local r=$((size * 22 / 100))
  glyph /tmp/edspace-tile-$$.png "$size" "$GREEN" "$INK" $((size * 47 / 100)) $((size * 3 / 100)) $((size * 64 / 100)) $((size * 15 / 100)) $((size * 31 / 100))
  magick /tmp/edspace-tile-$$.png \
    \( -size "${size}x${size}" xc:none -fill white -draw "roundrectangle 0,0 $((size - 1)),$((size - 1)) $r,$r" \) \
    -alpha set -compose DstIn -composite -depth 8 "$out"
  rm -f /tmp/edspace-tile-$$.png
}
tile "$OUT/splash-icon.png" 1024
tile "$OUT/favicon.png" 48

echo "Icons written to $OUT"

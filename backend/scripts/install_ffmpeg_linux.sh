#!/usr/bin/env bash
# Download a portable, statically-linked ffmpeg binary (Linux amd64/arm64)
# into backend/bin/ffmpeg.
#
# Purpose: make ffmpeg independent of whatever is (or isn't) installed via
# apt on the target machine (e.g. a Debian 12 GCE VM), independent of apt
# package version, and independent of root access — this static binary has
# zero external dependencies and works immediately after download.
#
# Usage (run on a Debian 12 VM or any Linux machine):
#   bash scripts/install_ffmpeg_linux.sh
#
# Source: official static builds provided by John Van Sickle (widely used
# in the industry)
#   https://johnvansickle.com/ffmpeg/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${SCRIPT_DIR}/../bin"
TMP_DIR="$(mktemp -d)"

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)
    FFMPEG_ARCH="amd64"
    ;;
  aarch64|arm64)
    FFMPEG_ARCH="arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH. Please manually download the matching ffmpeg static build." >&2
    exit 1
    ;;
esac

URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${FFMPEG_ARCH}-static.tar.xz"

echo "Detected architecture: ${FFMPEG_ARCH}"
echo "Downloading: ${URL}"
curl -L -o "${TMP_DIR}/ffmpeg.tar.xz" "${URL}"

echo "Extracting..."
tar -xf "${TMP_DIR}/ffmpeg.tar.xz" -C "${TMP_DIR}"

EXTRACTED_DIR="$(find "${TMP_DIR}" -maxdepth 1 -type d -name 'ffmpeg-*-static')"

mkdir -p "${BIN_DIR}"
cp "${EXTRACTED_DIR}/ffmpeg" "${BIN_DIR}/ffmpeg"
cp "${EXTRACTED_DIR}/ffprobe" "${BIN_DIR}/ffprobe"
chmod +x "${BIN_DIR}/ffmpeg" "${BIN_DIR}/ffprobe"

rm -rf "${TMP_DIR}"

echo "Done! ffmpeg installed at: ${BIN_DIR}/ffmpeg"
"${BIN_DIR}/ffmpeg" -version | head -1

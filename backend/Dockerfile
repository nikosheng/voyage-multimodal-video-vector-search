# Multi-stage build: pull current, actively-maintained static ffmpeg/ffprobe
# binaries from the mwader/static-ffmpeg image rather than apt (Debian's
# packaged ffmpeg is frozen to whatever version shipped with that Debian
# release, often a year+ behind upstream).
FROM mwader/static-ffmpeg:9.0.2-1 AS ffmpeg

FROM python:3.12-slim

COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY scripts/ ./scripts/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

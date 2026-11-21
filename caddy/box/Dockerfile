# The web image for the long-running copy on the dev box: the frontend,
# built, and served by Caddy beside the API. Build context: the repository
# root.
#
#   docker build -f caddy/box/Dockerfile .

# Both images pinned by digest. To update one, pull it and read its digest
# with `docker inspect --format='{{index .RepoDigests 0}}' <image>`.
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
ARG CADDY_IMAGE=public.ecr.aws/docker/library/caddy:2-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0

# ---------- Build the frontend ----------
FROM ${NODE_IMAGE} AS build

WORKDIR /srv/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY frontend/ ./
RUN npm run build

# ---------- Serve it ----------
FROM ${CADDY_IMAGE} AS box

COPY caddy/box/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /srv/frontend/dist /srv

EXPOSE 80

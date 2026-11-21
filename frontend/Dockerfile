# The frontend's development image, for the Vite dev server. Ported from
# Turva.
#
# Development only. A deployment serves the built bundle as static files,
# so there is no Node process in production, and this image makes no
# attempt to be small.
#
# Node 26, pinned by digest, from Amazon's public copy of Docker Hub's
# official image. To update, run:
#   docker pull public.ecr.aws/docker/library/node:26.13.0-alpine
#   docker inspect --format='{{index .RepoDigests 0}}' public.ecr.aws/docker/library/node:26.13.0-alpine
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

FROM ${NODE_IMAGE} AS dev

WORKDIR /srv/frontend

# Packages first, so editing source does not reinstall them. `npm ci`
# installs exactly the committed lock, and fails if package.json and the
# lock disagree.
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

# The source arrives through a bind mount in the dev stack, so the dev
# server picks up edits without a rebuild. Copied here too, so the image
# works on its own.
COPY . .

EXPOSE 5273

CMD ["npm", "run", "dev"]

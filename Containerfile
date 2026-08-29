# The Keydra documentation as a container.
#
# Two stages: Node builds the site, and a Red Hat UBI nginx serves the static output. The
# runtime carries no Node, no build tools and no sources — everything it holds is what a
# browser downloads.
#
#   podman build -t localhost/keydra-docs:dev -f Containerfile .
#   podman run --rm -p 8080:8080 localhost/keydra-docs:dev
#
# Called a Containerfile rather than a Dockerfile for the reason the application's is:
# this project is built with Podman, and both engines read either name.

# --- Stage 1: build ------------------------------------------------------------
# The Node version is the one .nvmrc pins, so the image cannot drift from what the
# documentation is developed against.
FROM docker.io/library/node:24-alpine AS build

WORKDIR /build

# Dependencies first: they change far less often than the content, so this layer survives
# almost every rebuild.
COPY docs/package.json docs/yarn.lock docs/.yarnrc.yml ./
RUN corepack enable && yarn install --immutable

# The build reads the Keydra source tree for the inventory the reference tables are
# generated from, so both trees have to be present. The context is expected to hold this
# repository and a `keydra/` checkout beside it:
#
#   podman build -t keydra-docs -f docs/Containerfile .
COPY keydra/keydra-backend/ /source/backend/
COPY keydra/keydra-frontend/ /source/frontend/
COPY keydra/logo/ /source/logo/
COPY docs/ ./
ENV KEYDRA_SOURCE=/source

# A base path can be baked in for a deployment under a subpath:
#   podman build --build-arg BASE_PATH=/keydra/ ...
ARG BASE_PATH=/
ARG BASE_URL=
RUN yarn build --base-path "${BASE_PATH}" ${BASE_URL:+--base-url "${BASE_URL}"}

# --- Stage 2: serve ------------------------------------------------------------
# UBI's nginx image runs as an unprivileged user, listens above 1024, and keeps its
# writable state in directories that are group-writable — which is what makes it start
# under an arbitrary UID, the way OpenShift assigns one.
FROM registry.access.redhat.com/ubi9/nginx-124:latest

# The image's own user, rather than a UID this file invents.
USER 1001

COPY --from=build /build/dist/ /opt/app-root/src/
COPY docs/deploy/nginx.conf /opt/app-root/etc/nginx.default.d/keydra-docs.conf

EXPOSE 8080

# The site is static files: if the index answers, it is serving.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD ["sh", "-c", "curl -fsS http://localhost:8080/ >/dev/null || exit 1"]

CMD ["nginx", "-g", "daemon off;"]

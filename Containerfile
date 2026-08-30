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
# nginx installed onto ubi-minimal rather than Red Hat's s2i nginx image.
#
# That image is built to compile an application inside the container, so it carries gdb, vim,
# rsync, python3 and the whole Perl stack: 252 packages against this one's 136, for an image
# whose entire job is to serve files that were built in the stage above. None of those five
# is here.
#
# What it costs is deploy/nginx.conf, which is now the whole configuration rather than a
# fragment dropped into somebody else's.
FROM registry.access.redhat.com/ubi10/ubi-minimal:latest

# `update` ahead of `install`, in the one layer: `latest` is rebuilt on Red Hat's cadence
# while UBI ships errata between those rebuilds, so the tag is where the packages start
# rather than where they currently are.
RUN microdnf -y update \
    && microdnf -y install nginx \
    && microdnf -y clean all \
    && rm -rf /var/cache/yum

# `install -d` rather than mkdir followed by chmod -R: under a rootless build the recursive
# chmod applies to the parent and then fails on the directory it just created, with
# "Operation not permitted" from root. Group 0 rather than a uid, because that is what lets a
# platform assign an arbitrary one.
RUN install -d -m 0775 -o 1001 -g 0 /opt/keydra /opt/keydra/html /opt/keydra/etc

COPY --from=build --chown=1001:0 /build/dist/ /opt/keydra/html/
COPY --chown=1001:0 docs/deploy/nginx.conf /opt/keydra/etc/nginx.conf

USER 1001

EXPOSE 8080

# The site is static files: if the index answers, it is serving.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD ["sh", "-c", "curl -fsS http://localhost:8080/ >/dev/null || exit 1"]

CMD ["nginx", "-c", "/opt/keydra/etc/nginx.conf", "-g", "daemon off;"]

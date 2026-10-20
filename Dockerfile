# NeoMundi measurement MCP connector — local container image.
#
# Reproducible by construction: the connector has NO runtime dependencies, so
# there is nothing to install, no lockfile to resolve and no network access
# needed at build time. The image is the pinned base plus this repository's
# source. Two builds of the same commit on the same base digest are identical
# but for timestamps.
#
# NOT PUBLISHED ANYWHERE. Built locally, run locally. No registry is
# configured and none should be added without an explicit decision: this
# connector is private, and an image is a distribution channel.
#
# Pin the base by digest, not by tag, before relying on a build for evidence.
# `node:24-alpine` is a moving target; the digest is not. The tag is used here
# so a first build works on any machine, and the digest line below is where a
# reproducible build pins it.
#   FROM node@sha256:<digest>   # node:24-alpine, resolved on <date>
FROM node:24-alpine

# Node 24 is required, not preferred: the adapter uses JSON.rawJSON and the
# JSON.parse source context to keep API numbers byte-exact. On an older
# runtime the connector does not degrade — it fails to start.
RUN node --version

WORKDIR /app

# Source only. No `npm install` step exists because there is nothing to
# install; adding one would introduce the supply chain this design avoids.
COPY package.json ./
COPY runtime/ ./runtime/
COPY tests/ ./tests/
COPY schemas/ ./schemas/
# Read by the repository-level audit suite below: the proposed tool payload it
# asserts is marked synthetic and non-executable.
COPY examples/ ./examples/

# The offline suite, in the image, at build time. A build that cannot pass its
# own tests does not produce a runnable image. No credential is read and no
# network call is made: the suite drives the adapter with injected mocks.
# The recorded-response replay skips here by design — those recordings are
# execution data kept outside the repository, and are not copied in.
RUN npm test

# Unprivileged. The `node` user ships with the base image.
USER node

# Inside a container a listener on loopback is unreachable through a published
# port, so the image sets the bind address explicitly. This is the one place
# the non-loopback bind is the correct default, and it is visible here rather
# than hidden in an entrypoint script. The consequence is stated at startup by
# the server itself, on stderr.
ENV NEOMUNDI_MCP_BIND=0.0.0.0
ENV NEOMUNDI_MCP_PORT=8787

# No credential is baked in, and no .env file is read by the server. Supply
# NEOMUNDI_API_KEY and NEOMUNDI_MCP_API_KEY at run time:
#   docker run --rm -p 8787:8787 \
#     -e NEOMUNDI_API_KEY -e NEOMUNDI_MCP_API_KEY \
#     neomundi-measurement-mcp:local
#
# Publish the port ONE-TO-ONE. The Host allow-list accepts only
# `127.0.0.1:<port>` and `localhost:<port>` for the port the server listens
# on; `-p 9000:8787` makes a client send `Host: localhost:9000`, which is
# refused with 403 invalid_host. That check is deliberate — see
# runtime/tests/bind-address.test.mjs.
EXPOSE 8787

# The server handles SIGTERM and SIGINT: it stops accepting, aborts in-flight
# calls and lets the loop drain. `node` as PID 1 receives them directly, so no
# init shim is needed and `docker stop` is a clean stop, not a kill.
STOPSIGNAL SIGTERM

# A health probe would have to present the Bearer credential to get past the
# 401, so none is declared here: a probe carrying the MCP credential in the
# image metadata is worse than no probe. Check liveness from outside with the
# credential you already hold.

CMD ["node", "runtime/server.mjs"]

# LDOC — Docker Build
# Produces: ldoc (CLI), ldoc-view (viewer), ldoc-server (REST API), ldoc-runtime (runtime CLI)
#
# Build:  docker build -t ldoc:latest .
# Run CLI: docker run --rm -v $(pwd):/data ldoc:latest ldoc validate /data/my.ldocx
# Run server: docker run --rm -p 8080:8080 ldoc:latest ldoc-server

FROM rust:1.82-slim AS builder

WORKDIR /build

# Cache dependencies first
COPY Cargo.toml Cargo.lock ./
COPY ldoc-core/Cargo.toml ldoc-core/
COPY ldoc-runtime/Cargo.toml ldoc-runtime/
COPY ldoc-sdk/Cargo.toml ldoc-sdk/

# Create stub lib files so cargo can resolve deps
RUN mkdir -p ldoc-core/src ldoc-runtime/src ldoc-sdk/src && \
    echo "fn main(){}" > ldoc-core/src/main.rs && \
    echo "" > ldoc-core/src/lib.rs && \
    echo "fn main(){}" > ldoc-runtime/src/main.rs && \
    echo "" > ldoc-runtime/src/lib.rs && \
    echo "fn main(){}" > ldoc-sdk/src/server_main.rs && \
    echo "" > ldoc-sdk/src/lib.rs

RUN cargo build --release 2>/dev/null || true

# Now copy real source
COPY ldoc-core/src ldoc-core/src/
COPY ldoc-core/examples ldoc-core/examples/
COPY ldoc-runtime/src ldoc-runtime/src/
COPY ldoc-sdk/src ldoc-sdk/src/
COPY ldoc-sdk/tests ldoc-sdk/tests/
COPY tests/ tests/

# Build all binaries
RUN cargo build --release

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/ldoc          /usr/local/bin/ldoc
COPY --from=builder /build/target/release/ldoc-view     /usr/local/bin/ldoc-view
COPY --from=builder /build/target/release/ldoc-server   /usr/local/bin/ldoc-server
COPY --from=builder /build/target/release/ldoc-runtime  /usr/local/bin/ldoc-runtime

WORKDIR /data
VOLUME ["/data"]

EXPOSE 8080

# Default: show version
CMD ["ldoc", "version"]

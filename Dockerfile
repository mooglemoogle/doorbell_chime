# Stage 1: build the web client
FROM oven/bun:1 AS web-builder
WORKDIR /app/web-client
COPY web-client/package.json web-client/bun.lock ./
RUN bun install --frozen-lockfile
COPY web-client/ ./
RUN bun run build

# Stage 2: production image
FROM oven/bun:1
WORKDIR /app

COPY lights-control-server/package.json lights-control-server/bun.lock ./lights-control-server/
RUN cd lights-control-server && bun install --frozen-lockfile --production

COPY lights-control-server/ ./lights-control-server/
COPY data/ ./data/
COPY --from=web-builder /app/web-client/dist ./web-client/dist

ENV APP_PORT=8080
ENV WS_PORT=3002
ENV LIGHTS_DATA_DIR=/data/lights-control

EXPOSE 8080
EXPOSE 3002

CMD ["bun", "lights-control-server/src/index.ts"]

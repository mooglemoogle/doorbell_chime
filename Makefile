.PHONY: dev build test

dev:
	@trap 'kill 0' SIGINT; \
	(cd lights-control-server && bun --watch src/index.ts) & \
	(cd web-client && bun run scripts/build.ts --dev) & \
	wait

build:
	cd lights-control-server && tsc -p .
	cd web-client && bun run scripts/build.ts

test:
	cd lights-control-server && bun test

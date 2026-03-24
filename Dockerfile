# Stage 1: Build the application
FROM oven/bun:latest AS build
WORKDIR /home/bun/app

# Copy dependency definition files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the frontend - this generates /app/dist/index.js
RUN bun run build

# Copy all static assets from the public directory into the dist folder.
# This is more robust than copying files individually.
COPY src/public/ /home/bun/app/dist/

# Automatically set the version/build date in index.html
RUN BUILD_DATE=$(date "+%Y-%m-%d %H:%M:%S %Z") && sed -i "s/__VERSION__/$BUILD_DATE/g" /home/bun/app/dist/index.html
# Stage 2: Create the production image
FROM oven/bun:latest
WORKDIR /home/bun/app
# Inside Stage 2
COPY --from=build /home/bun/app/package.json ./package.json
# 1. Copy the built assets
COPY --from=build --chown=bun:bun /home/bun/app/dist ./dist

# 2. Copy the server script
COPY --from=build --chown=bun:bun /home/bun/app/src/server.prod.ts ./server.prod.ts

# 3. CRITICAL: Copy package.json so the script can read the version!
COPY --from=build --chown=bun:bun /home/bun/app/package.json ./package.json

EXPOSE 8080

# Run from the explicit WORKDIR
CMD ["bun", "run", "server.prod.ts"]
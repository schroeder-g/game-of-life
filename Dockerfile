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
# The WORKDIR is /home/bun by default. We will place our app files here.

# Copy built assets and server from the build stage to the current directory,
# and ensure they are owned by the 'bun' user.
COPY --from=build --chown=bun:bun /home/bun/app/dist ./dist
COPY --from=build --chown=bun:bun /home/bun/app/src/server.prod.ts ./server.prod.ts

EXPOSE 8080

# Run the server using Bun. The base image is already configured to run as the 'bun' user.
CMD ["bun", "run", "server.prod.ts"]

# Stage 1: Build the application
FROM oven/bun:latest AS build
WORKDIR /app

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
COPY src/public/ /app/dist/

# Automatically set the version/build date in index.html
RUN BUILD_DATE=$(date "+%Y-%m-%d %H:%M:%S %Z") && sed -i "s/__VERSION__/$BUILD_DATE/g" /app/dist/index.html
# Stage 2: Create the production image
FROM oven/bun:latest
WORKDIR /app

# Copy the final built assets from the build stage.
COPY --from=build /app/dist ./dist

# Copy the production server.
COPY --from=build /app/src/server.prod.ts ./server.prod.ts

EXPOSE 8080

# Run the server using Bun
CMD ["bun", "run", "server.prod.ts"]
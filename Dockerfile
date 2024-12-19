# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install  # Using `npm install` instead of `npm ci`

# Copy source code
COPY . .

# Build if needed (uncomment if you have a build step)
# RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production  # Using `npm install` instead of `npm ci`

# Copy built files from builder
COPY --from=builder /app /app

# Add labels
LABEL maintainer="qdung.le3912@gmail.com"
LABEL version="1.0"
LABEL description="Media Scraper Service"

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "node src/app.js"]
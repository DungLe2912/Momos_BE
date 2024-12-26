ARG TARGETPLATFORM=linux/amd64
# Build stage
FROM --platform=$TARGETPLATFORM node:18 as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install # Using `npm install` instead of `npm ci`

# Copy source code
COPY . .

# Build if needed (uncomment if you have a build step)
# RUN npm run build

# Production stage
FROM --platform=$TARGETPLATFORM node:18

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Install necessary dependencies for Puppeteer and Chromium
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production # Using `npm install` instead of `npm ci`


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
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
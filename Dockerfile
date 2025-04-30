FROM node:18-slim

# Cài Chromium dependencies (bao gồm libgbm1)
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  xdg-utils \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Tạo thư mục app
WORKDIR /app

# Cài npm packages
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Đảm bảo Puppeteer sẽ tải Chromium (hoặc bạn có thể tự bundle nếu cần)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

EXPOSE 3000

# Command để khởi chạy app
CMD ["npm", "start"]

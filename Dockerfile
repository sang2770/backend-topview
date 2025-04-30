# Dùng image node base có apt để cài các gói cần thiết
FROM node:18-slim

# Install các dependency cần thiết để Chromium chạy được
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
  xdg-utils \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Tạo thư mục chứa project
WORKDIR /app

# Copy file và cài đặt
COPY package*.json ./
RUN npm install

# Copy toàn bộ source code vào
COPY . .

# Puppeteer sẽ tải Chromium tại thời điểm cài đặt
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# Expose port (nếu app sử dụng port khác, thay đổi tại đây)
EXPOSE 3000

# Command để khởi chạy app
CMD ["npm", "start"]

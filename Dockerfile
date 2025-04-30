# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose port (thay đổi nếu cần)
EXPOSE 3000

# Start app
CMD ["npm", "start"]

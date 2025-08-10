FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port for Hardhat network
EXPOSE 8545

# Start Hardhat network
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]

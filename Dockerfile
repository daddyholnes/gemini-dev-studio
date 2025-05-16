FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=development

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

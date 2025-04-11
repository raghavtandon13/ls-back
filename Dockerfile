
# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app files
COPY . .

# Expose the app's port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]

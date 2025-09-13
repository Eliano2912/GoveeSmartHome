FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .
CMD ["npx", "nodemon", "--watch", "src", "src/index.js"]

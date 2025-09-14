#development data
#FROM node:20-alpine
#WORKDIR /app
#COPY package*.json ./
#RUN npm install --production=false
#COPY . .
#CMD ["npx", "nodemon", "--watch", "src", "src/index.js"]

#productive data
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "src/index.js"]

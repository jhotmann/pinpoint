FROM node:16

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8000
EXPOSE 8888

CMD ["npm", "start"]
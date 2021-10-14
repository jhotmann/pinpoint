FROM node:16

WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npm i -g forever
ENV BEHIND_PROXY=true

COPY . .

EXPOSE 8000
EXPOSE 8888

CMD ["npm", "start"]
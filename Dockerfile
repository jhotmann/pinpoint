FROM node:16

ENV BEHIND_PROXY=true
ENV NODE_ENV=production

EXPOSE 8000
EXPOSE 8888

WORKDIR /app
COPY package*.json ./
RUN  npm ci
RUN npm i -g forever

COPY . .

CMD ["npm", "start"]
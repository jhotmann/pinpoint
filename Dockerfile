FROM node:16

ENV BEHIND_PROXY=true
ENV NODE_ENV=production

COPY setup.sh ./
RUN chmod +x setup.sh && ./setup.sh

WORKDIR /app
COPY package*.json ./
RUN  npm ci
RUN npm i -g forever

COPY . .

EXPOSE 8000
EXPOSE 8888

CMD ["npm", "start"]
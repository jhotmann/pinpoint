FROM node:16

ENV BEHIND_PROXY=true
ENV NODE_ENV=production
ENV ADMIN_PASSWORD=pinpointadmin
ENV JWT_SECRET=pleasechangeme

EXPOSE 8000
EXPOSE 8888

WORKDIR /app
COPY package*.json ./
RUN  npm ci
RUN npm i -g forever

COPY . .

CMD ["npm", "start"]
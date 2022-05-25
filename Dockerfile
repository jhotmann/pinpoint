FROM node:lts-bullseye

# Default environment variables
ENV BEHIND_PROXY=true
ENV NODE_ENV=production
ENV ADMIN_PASSWORD=pinpointadmin
ENV JWT_SECRET=pleasechangeme
ENV APPRISE_HOST=cli

EXPOSE 8000
EXPOSE 8888

# Dependencies
RUN apt-get update || : && apt-get install python3 python3-pip -y
RUN pip3 install apprise
RUN npm i -g forever

# Application
WORKDIR /app
COPY package*.json ./
RUN  npm ci

COPY . .

CMD ["npm", "start"]
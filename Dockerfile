FROM node:16

ENV BEHIND_PROXY=true
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json setup.sh ./
RUN chmod +x setup.sh && ./setup.sh

COPY . .

EXPOSE 8000
EXPOSE 8888

CMD ["npm", "start"]
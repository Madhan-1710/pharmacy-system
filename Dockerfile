
FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public

ENV PORT=3000
ENV APP_VERSION=v1

EXPOSE 3000

CMD ["npm", "start"]

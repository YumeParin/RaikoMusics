FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY ./src ./src

VOLUME /var/www/music

EXPOSE 3000

CMD [ "node", "src/index.js" ]
FROM nginx:alpine

COPY ./web/index.html /usr/share/nginx/html
COPY ./web/manage.html /usr/share/nginx/html
COPY ./web/data.json /usr/share/nginx/html
COPY ./web/favicon.ico /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


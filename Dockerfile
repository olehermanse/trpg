FROM node:14 AS build
ADD ./ /towers
WORKDIR /towers
RUN rm -rf frontend/dist
RUN npm install --only=prod
RUN npm run build
RUN bash add_version.sh

FROM nginx:stable-alpine
COPY --from=build /towers/frontend/dist/index.html /usr/share/nginx/html/index.html
COPY --from=build /towers/frontend/dist/favicon.ico /usr/share/nginx/html/favicon.ico

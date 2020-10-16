FROM node:8 AS build
ADD ./ /towers
WORKDIR /towers
RUN rm -rf frontend/dist
RUN npm install --only=prod
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /towers/frontend/dist/index.html /usr/share/nginx/html/index.html

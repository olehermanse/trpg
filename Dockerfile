FROM node:8 AS build
ADD ./ /gulp-example
WORKDIR /gulp-example
RUN rm -rf frontend/dist
RUN npm install --only=prod
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /gulp-example/frontend/dist/index.html /usr/share/nginx/html/index.html

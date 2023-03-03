FROM node:18 AS build
WORKDIR /towers
COPY package-lock.json package.json ./
RUN npm install --only=prod
COPY . ./
RUN rm -rf dist
RUN npm run build
RUN bash add_version.sh

FROM nginx:1.22.1
COPY --from=build /towers/public/favicon.ico /usr/share/nginx/html/
COPY --from=build /towers/dist/index.html /usr/share/nginx/html/
COPY --from=build /towers/dist/assets/index-*.js /usr/share/nginx/html/assets/
COPY --from=build /towers/dist/assets/index-*.css /usr/share/nginx/html/assets/

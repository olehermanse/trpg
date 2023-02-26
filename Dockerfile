FROM node:18 AS build
WORKDIR /towers
COPY package-lock.json package.json ./
RUN npm install --only=prod
COPY . ./
RUN rm -rf frontend/dist
RUN npm run build
RUN bash add_version.sh

FROM nginx:1.22.1
COPY --from=build /towers/frontend/dist/scripts/main.js.map /usr/share/nginx/html/main.js.map
COPY --from=build /towers/frontend/dist/index.html /usr/share/nginx/html/index.html
COPY --from=build /towers/frontend/dist/favicon.ico /usr/share/nginx/html/favicon.ico

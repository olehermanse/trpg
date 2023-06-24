FROM node:18 AS build
WORKDIR /towers
COPY package-lock.json package.json ./
RUN npm install --only=prod
COPY . ./
RUN rm -rf dist
RUN npm run build
RUN npm install
RUN npm run test
RUN bash add_version.sh
CMD [ "node" , "dist/backend/backend.js"]

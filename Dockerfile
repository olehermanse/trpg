FROM node:20 AS build
WORKDIR /trpg
COPY package-lock.json package.json ./
RUN npm install --only=prod
COPY .git .git
COPY src src
COPY public public
COPY add_version.sh add_version.sh
COPY tsconfig.json tsconfig.json
COPY vite.config.js vite.config.js
COPY index.html index.html
RUN rm -rf dist
RUN npm run build
RUN bash add_version.sh

FROM node:20 AS npmtest
WORKDIR /trpg
COPY --from=build /trpg /trpg
COPY test test
RUN npm install
RUN npm run tsc
RUN npm run test

FROM denoland/deno:2.1.9 AS denotest
WORKDIR /trpg
COPY --from=build /trpg /trpg
COPY deno.json /trpg/deno.json
COPY test test
RUN deno install
RUN deno task tsc
RUN deno check --frozen --all src/
RUN deno task test

FROM denoland/deno:2.1.9 AS run
WORKDIR /trpg
COPY --from=build /trpg/dist/ dist/
COPY src/ src/
COPY --from=npmtest /trpg/package.json /trpg/package.json
COPY --from=denotest /trpg/package.json /trpg/package.json
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]

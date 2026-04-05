FROM docker.io/denoland/deno:2.7.11@sha256:869e31370dca82b10abefeabe92a2efae44c0d8c70e03776b05ca07ce6b2e062 AS build
RUN apt-get update -y
RUN apt-get install -y git
WORKDIR /trpg
COPY package-lock.json package.json ./
RUN deno install
COPY .git .git
COPY src src
COPY public public
COPY add_version.sh add_version.sh
COPY tsconfig.json tsconfig.json
COPY vite.config.js vite.config.js
COPY index.html index.html
RUN rm -rf dist
RUN deno run build
RUN bash add_version.sh
RUN rm -rf node_modules

FROM docker.io/node:22.22.0@sha256:cd7bcd2e7a1e6f72052feb023c7f6b722205d3fcab7bbcbd2d1bfdab10b1e935 AS npmtest
WORKDIR /trpg
COPY --from=build /trpg/package-lock.json /trpg/package.json ./
RUN npm install
COPY --from=build /trpg /trpg
COPY test test
RUN npm run tsc
RUN npm run build

FROM docker.io/denoland/deno:2.7.11@sha256:869e31370dca82b10abefeabe92a2efae44c0d8c70e03776b05ca07ce6b2e062 AS denotest
WORKDIR /trpg
COPY --from=build /trpg/package-lock.json /trpg/package.json ./
RUN deno install
COPY --from=build /trpg /trpg
COPY deno.json /trpg/deno.json
COPY test test
RUN deno lint
RUN deno task tsc
RUN deno check --frozen --all src/
RUN deno task test

FROM docker.io/denoland/deno:2.7.11@sha256:869e31370dca82b10abefeabe92a2efae44c0d8c70e03776b05ca07ce6b2e062 AS run
WORKDIR /trpg
COPY --from=build /trpg/dist/ dist/
COPY src/ src/
COPY --from=npmtest /trpg/package.json /trpg/package.json
COPY --from=denotest /trpg/package.json /trpg/package.json
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]

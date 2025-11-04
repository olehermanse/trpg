FROM docker.io/denoland/deno:2.5.6@sha256:3ea71953ff50e3ff15c377ead1a8521f624e2f43d27713675a8bed7b33f166aa AS build
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

FROM docker.io/node:22.17.0@sha256:2fa6c977460b56d4d8278947ab56faeb312bc4cc6c4cf78920c6de27812f51c5 AS npmtest
WORKDIR /trpg
COPY --from=build /trpg/package-lock.json /trpg/package.json ./
RUN npm install
COPY --from=build /trpg /trpg
COPY test test
RUN npm run tsc
RUN npm run build

FROM docker.io/denoland/deno:2.5.6@sha256:3ea71953ff50e3ff15c377ead1a8521f624e2f43d27713675a8bed7b33f166aa AS denotest
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

FROM docker.io/denoland/deno:2.5.6@sha256:3ea71953ff50e3ff15c377ead1a8521f624e2f43d27713675a8bed7b33f166aa AS run
WORKDIR /trpg
COPY --from=build /trpg/dist/ dist/
COPY src/ src/
COPY --from=npmtest /trpg/package.json /trpg/package.json
COPY --from=denotest /trpg/package.json /trpg/package.json
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]

FROM node:20@sha256:6f076db82169a365abca591093bdf020f9e8827a8add8ea3826556c290b340c0 AS build
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
RUN rm -rf node_modules

FROM node:20@sha256:6f076db82169a365abca591093bdf020f9e8827a8add8ea3826556c290b340c0 AS npmtest
WORKDIR /trpg
COPY --from=build /trpg/package-lock.json /trpg/package.json ./
RUN npm install
COPY --from=build /trpg /trpg
COPY test test
RUN npm run tsc

FROM denoland/deno:2.3.1@sha256:c75db9474ed7bfc24a4b0aa946767ee4a84a30034c188ce55078a591477d5f3e AS denotest
WORKDIR /trpg
COPY --from=build /trpg/package-lock.json /trpg/package.json ./
RUN deno install
COPY --from=build /trpg /trpg
COPY deno.json /trpg/deno.json
COPY test test
RUN deno task tsc
RUN deno check --frozen --all src/
RUN deno task test

FROM denoland/deno:2.3.1@sha256:c75db9474ed7bfc24a4b0aa946767ee4a84a30034c188ce55078a591477d5f3e AS run
WORKDIR /trpg
COPY --from=build /trpg/dist/ dist/
COPY src/ src/
COPY --from=npmtest /trpg/package.json /trpg/package.json
COPY --from=denotest /trpg/package.json /trpg/package.json
CMD [ "deno" , "run", "--allow-net", "--allow-read", "--allow-env", "src/backend/backend.ts"]

# Builds the production app: the API and the built client, served by one Node process.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/client apps/client
RUN npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev && npm cache clean --force
COPY packages/shared/src packages/shared/src
COPY apps/server/src apps/server/src
COPY apps/server/migrations apps/server/migrations
COPY --from=build /app/apps/client/dist apps/client/dist
RUN mkdir data && chown node:node data
USER node
EXPOSE 3000
# Run node directly (not npm) so it receives stop signals as PID 1.
CMD ["node", "apps/server/src/index.ts"]

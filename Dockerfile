# Week 5: switch to a Playwright base image and bundle the DB-IP Lite database.
FROM node:26-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.19.0
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter seuil build

FROM node:26-slim
WORKDIR /app
COPY --from=build /app/packages/seuil/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts
COPY --from=build /app/packages/seuil/dist ./dist
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["check"]

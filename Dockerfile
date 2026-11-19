# Seuil compliance gate. Usage, from the project to audit:
#   docker run --rm -v "$PWD:/work" ghcr.io/phlearning/seuil check
# The image contains headless Chromium, the CLI, the guided review UI,
# the WCAG and provider data, and this month's DB-IP Lite database (CC BY 4.0).

FROM node:22-bookworm-slim AS build
WORKDIR /src
RUN npm install -g pnpm@12.19.0
COPY . .
RUN pnpm install --frozen-lockfile --filter seuil --filter @seuil/review... \
 && pnpm --filter seuil build \
 && pnpm --filter @seuil/tokens build \
 && pnpm --filter @seuil/review build \
 && node scripts/fetch-geoip.mjs

FROM node:22-bookworm-slim
LABEL org.opencontainers.image.source="https://github.com/phlearning/seuil" \
      org.opencontainers.image.description="Compliance gate: WCAG 2.2 AA, eCH-0059, nLPD and security checks"
ENV NODE_ENV=production \
    SEUIL_DATA=/app/data \
    SEUIL_REVIEW_UI=/app/review \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY --from=build /src/packages/seuil/package.json ./package.json
# Only headless Chromium and its system libraries: the rules never need Firefox or WebKit.
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
 && npx playwright install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm
COPY --from=build /src/packages/seuil/dist ./dist
COPY --from=build /src/packages/review/dist ./review
COPY --from=build /src/data/providers ./data/providers
COPY --from=build /src/data/wcag ./data/wcag
COPY --from=build /src/data/geoip ./data/geoip
WORKDIR /work
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["check"]

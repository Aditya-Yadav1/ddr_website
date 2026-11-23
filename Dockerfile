FROM node:24-bookworm-slim AS web
WORKDIR /build/mobile
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci
COPY mobile/ ./
RUN npm run export:web

FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node *.js ./
COPY --chown=node:node mobile/shared ./mobile/shared
COPY --from=web --chown=node:node /build/mobile/dist ./mobile/dist
COPY --chown=node:node scripts ./scripts
RUN mkdir /data && chown node:node /data
USER node
ENV NODE_ENV=production HANDYHIVE_HOST=0.0.0.0 HANDYHIVE_PORT=4174 HANDYHIVE_DB=/data/handyhive.sqlite HANDYHIVE_PHONE_MODE=twilio
EXPOSE 4174
CMD ["node", "server.js"]

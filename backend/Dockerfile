FROM node:20-alpine AS base
WORKDIR /app
# Prisma's query/schema engines are native binaries that link against OpenSSL.
# node:20-alpine ships without it, which causes cryptic "Could not parse schema
# engine response" / JSON parse errors at runtime - installing it here (and it
# being present in every stage that inherits from `base`) fixes that.
RUN apk add --no-cache openssl libssl3

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
# Generates the Prisma client + engine binary matching this image's OS/OpenSSL
# (see binaryTargets in prisma/schema.prisma) - must run after `npm install`
# and before `npm run build` so the generated client types are available.
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
# Copy node_modules from the BUILD stage (not `deps`), since that's the one
# where `prisma generate` actually ran - `deps`'s node_modules predates it and
# has no generated client at all.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000

# Apply pending migrations then start the API. Using `migrate deploy` (not `dev`)
# because it's non-interactive and safe to run automatically on every boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

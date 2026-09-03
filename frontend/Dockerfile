FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
# Baked in at build time since Next.js inlines NEXT_PUBLIC_* vars into the client bundle.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/app/data

VOLUME ["/app/data"]
EXPOSE 8787

CMD ["npm", "start"]

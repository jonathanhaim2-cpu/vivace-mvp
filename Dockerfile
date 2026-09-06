FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV PORT=43145
EXPOSE 43145

CMD ["npm", "run", "start:prod"]

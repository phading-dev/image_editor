FROM node:22.20.0

WORKDIR /app
COPY package.json .
COPY package-lock.json .
COPY bin/ .
RUN npm ci --omit=dev

EXPOSE 80 443
CMD ["node", "main_bin", "static"]

FROM node:22.20.0

WORKDIR /app
COPY backend/package.json .
COPY bin/ .
RUN npm i --omit=dev

EXPOSE 80 443
CMD ["node", "main_bin", "static"]

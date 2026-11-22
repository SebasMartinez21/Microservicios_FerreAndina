FROM node:20-alpine

WORKDIR /app
COPY app/notificaciones/package*.json ./
RUN npm install

COPY app/notificaciones/ ./
# El contrato OpenAPI de la Entrega 2, para mostrarlo en /api-docs
COPY docs/contratos-api/notificaciones-openapi.yaml ./openapi.yaml

EXPOSE 3000
CMD ["npm", "start"]

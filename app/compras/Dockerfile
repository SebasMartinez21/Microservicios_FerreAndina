FROM node:20-alpine

WORKDIR /app
COPY app/compras/package*.json ./
RUN npm install

COPY app/compras/ ./
# El contrato OpenAPI de la Entrega 2, para mostrarlo en /api-docs
COPY docs/contratos-api/compras-openapi.yaml ./openapi.yaml

EXPOSE 3000
CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app
COPY app/inventario/package*.json ./
RUN npm install

COPY app/inventario/ ./
# El contrato OpenAPI de la Entrega 2, para mostrarlo en /api-docs
COPY docs/contratos-api/inventario-openapi.yaml ./openapi.yaml

EXPOSE 3000
CMD ["npm", "start"]
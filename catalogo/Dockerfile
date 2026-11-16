FROM node:20-alpine

WORKDIR /app
COPY catalogo/package*.json ./
RUN npm install

COPY catalogo/ ./
# El contrato OpenAPI de la Entrega 2, para mostrarlo en /api-docs
COPY Arquitectura_Modelos_relacionales/Contratos_Api_yaml/catalogo-openapi.yaml ./openapi.yaml

EXPOSE 3000
CMD ["npm", "start"]

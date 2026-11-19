# Se construye desde la raíz del repo (ver docker-compose.yml) para poder copiar el contrato OpenAPI

# Instala las dependencias de PHP con la imagen de composer
FROM composer:2 AS dependencias
WORKDIR /app
COPY app/gateway/composer.json app/gateway/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --ignore-platform-reqs
COPY app/gateway/ .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.2-apache

# Driver de MySQL para PHP + mod_rewrite (Laravel lo necesita para sus rutas)
RUN docker-php-ext-install pdo_mysql && a2enmod rewrite

# Apache sirve /var/www/html, pero Laravel se sirve desde su carpeta public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Los logs salen por la salida del contenedor (docker logs)
ENV LOG_CHANNEL=stderr

WORKDIR /var/www/html
COPY --from=dependencias /app ./
# El contrato OpenAPI de la Entrega 2, para mostrarlo en /api/docs
COPY docs/contratos-api/gateway-openapi.yaml ./openapi.yaml

# Apache corre como www-data y Laravel escribe en storage/ y bootstrap/cache/
RUN chown -R www-data:www-data storage bootstrap/cache

# Al arrancar crea las tablas y los usuarios de prueba, y luego prende Apache
CMD php artisan migrate --force --seed && apache2-foreground
EXPOSE 80

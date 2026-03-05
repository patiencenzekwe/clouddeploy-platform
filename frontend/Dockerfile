FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
# Pinpoint

A server for [OwnTracks](https://owntracks.org/) with several enhancements over a standard MQTT broker:

- Generate Registration Links
- Choose which users can see your location
- Device management
- Groups (coming soon)

## Installation

The recommended and supported installation method is using [Docker](https://www.docker.com/) via [Docker Compose](https://docs.docker.com/compose/). It is highly recommended that you host Pinpoint behind a reverse proxy that handles SSL/TLS, my personal favorite is [Caddy](https://caddyserver.com/v2).

Example:

```yaml
version: "3.8"

services:
  caddy:
    container_name: caddy
    image: lucaslorentz/caddy-docker-proxy:2.3
    restart: always
    ports:
      - 80:80
      - 443:443
    networks:
      - caddy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - caddy_data:/data
    depends_on:
      - ddns-updater
    deploy:
      placement:
        constraints:
          - node.role == manager
      replicas: 1
    labels:
      caddy.email: ${CERTIFICATE_EMAIL_ADDRESS}

  pinpoint:
    image: jhot/pinpoint:latest
    restart: always
    networks:
      - caddy
    ports:
      - 8000:8000
      - 8888:8888
    volumes:
      - ./apps/pinpoint:/app/data
    environment:
      - MQTT_HOST=pinpointmqtt.${DOMAIN_NAME}
      - ADMIN_PASSWORD=${PINPOINT_ADMIN_PASSWORD}
      - JWT_SECRET=${PINPOINT_JWT_SECRET}
    labels:
      caddy_0: pinpoint.${DOMAIN_NAME}
      caddy_0.reverse_proxy: "{{upstreams 8000}}"
      caddy_1: pinpointmqtt.${DOMAIN_NAME}
      caddy_1.reverse_proxy: "{{upstreams 8888}}"

networks:
  # caddy network allows the caddy to see any containers you want to expose to the internet
  caddy:
    driver: bridge
    ipam:
      config:
        - subnet: 172.18.1.0/24
          gateway: 172.18.1.1
      driver: default

# list data volumes here
volumes:
  caddy_data: {}

```

## How it works

The OwnTracks app by default publishes and subscribes to the `owntracks` topic. This allows anyone using the server to see the locations of everyone else on the server. This is fine in many cases, but if you want to share a server with multiple friend groups or family it's not ideal. By adding some logic and access control on the backend we can control which users your location is shared with. Pinpoint still listens on the `owntracks` topic, but the clients just listen on topic matching their username. When a location update comes in from a client, the user's configuration is checked and the message is re-published to each friend's topic.

Pinpoint also takes the hassle out of configuring the OwnTracks app, which is a lot of options even for a standard installation. For each device, the configuration is automatically generated and a link is created that when clicked will launch the OwnTracks app and import the configuration.
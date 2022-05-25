# Pinpoint

A server for [OwnTracks](https://owntracks.org/) with several enhancements over a standard MQTT broker:

- User Management
- Generate registration links
- Location sharing management
- Device management
- Groups

![Screenshot 2021-10-14 at 11-51-01 Pinpoint Server](https://user-images.githubusercontent.com/9577371/137370552-5cf96933-d52b-4324-b404-dec8df98c4b9.png)


## Installation

The recommended and supported installation method is using [Docker](https://www.docker.com/) via [Docker Compose](https://docs.docker.com/compose/). It is highly recommended that you host Pinpoint behind a reverse proxy that handles SSL/TLS, my personal favorite is [Caddy](https://caddyserver.com/v2). The MQTT server only supports websocket connections for now, so your proxy will need to be able to handle that.

## Configuration

| Environmental Variable | Description | Default | Example |
| ----- | ----- | ----- | ----- |
| HTTP_HOST | The protocol, hostname, and port (if necessary) for clients to connect to your server | | `http://192.168.0.2:8000` or `https://pinpoint.example.com` |
| MQTT_HOST | The hostname for clients to connect to the MQTT server. If set, client configuration links will use MQTT instead of HTTP settings. | | `pinpointmqtt.example.com` |
| ADMIN_PASSWORD | The password for the admin account | `pinpointadmin` | `mysupersecretpassword` |
| APPRISE_HOST | Either `cli` to use the [Apprise CLI](https://github.com/caronc/apprise) to send notifications or the protocol, hostname, and port of an [Apprise API](https://github.com/caronc/apprise-api) server | `cli` | `http://127.0.0.1:8000` |
| APPRISE_EMAIL_URL | [Apprise URI](https://github.com/caronc/apprise/wiki) for sending emails to users. The user's email address will be appended to this to build the final URI. If not set, notifications will be disabled. |  | `mailgun://admin@example.com/my-mailgun-token/` |
| JWT_SECRET | A random string | `pleasechangeme` | `eWF6vUCKXAgB2DK2bzWrJ4RJsALxE6eacKKQarKx` |
| CLEAR_CARD_CACHE | A cron expression (with seconds) to clear card cache and force devices to re-download card data | `0 0 0 * * *` aka midnight daily | `0 0 0 * * 0` aka midnight weekly on Sunday |

## Examples

#### HTTP Mode

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
      - HTTP_HOST=pinpoint.${DOMAIN_NAME}
      - ADMIN_PASSWORD=${PINPOINT_ADMIN_PASSWORD}
      - JWT_SECRET=${PINPOINT_JWT_SECRET}
      - APPRISE_EMAIL_URL=${APPRISE_EMAIL_URL}
    labels:
      caddy: pinpoint.${DOMAIN_NAME}
      caddy.reverse_proxy: "{{upstreams 8000}}"

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

#### MQTT Mode

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
      - HTTP_HOST=pinpoint.${DOMAIN_NAME}
      - MQTT_HOST=pinpointmqtt.${DOMAIN_NAME}
      - ADMIN_PASSWORD=${PINPOINT_ADMIN_PASSWORD}
      - JWT_SECRET=${PINPOINT_JWT_SECRET}
      - APPRISE_EMAIL_URL=${APPRISE_EMAIL_URL}
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

Caddy v2 config example if you aren't using Caddy-Docker-Proxy:

```
{
 	email certs@example.com
}
pinpoint.example.com {
  reverse_proxy 192.168.0.2:8000
}
pinpointmqtt.example.com {
 	reverse_proxy 192.168.0.2:8888
}
```

## How it works

The OwnTracks app by default publishes and subscribes to the `owntracks` topic. This allows anyone using the server to see the locations of everyone else on the server. This is fine in many cases, but if you want to share a server with multiple friend groups or family it's not ideal. By adding some logic and access control on the backend we can control which users your location is shared with. Pinpoint still listens on the `owntracks` topic, but the clients just listen on topic matching their username. When a location update comes in from a client, the user's configuration is checked and the message is re-published to each friend's topic.

Pinpoint also takes the hassle out of configuring the OwnTracks app, which is a lot of options even for a standard installation. For each device, the configuration is automatically generated and a link is created that when clicked will launch the OwnTracks app and import the configuration.
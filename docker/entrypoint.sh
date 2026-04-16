#!/bin/bash
set -e

export SERVER_PORT=9090
export TR_AUTH_URL=http://127.0.0.1:8001

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf

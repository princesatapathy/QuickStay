#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  db_no_proto="${DATABASE_URL#postgresql://}"
  db_no_proto="${db_no_proto#postgres://}"

  if [ -z "${SPRING_DATASOURCE_URL:-}" ]; then
    db_host_path="${db_no_proto#*@}"
    export SPRING_DATASOURCE_URL="jdbc:postgresql://${db_host_path}"
  fi

  if [ "$db_no_proto" != "${db_no_proto#*@}" ]; then
    db_credentials="${db_no_proto%%@*}"

    if [ -z "${SPRING_DATASOURCE_USERNAME:-}" ]; then
      export SPRING_DATASOURCE_USERNAME="${db_credentials%%:*}"
    fi

    if [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ] && [ "$db_credentials" != "${db_credentials#*:}" ]; then
      export SPRING_DATASOURCE_PASSWORD="${db_credentials#*:}"
    fi
  fi
fi

exec java ${JAVA_OPTS:-} -jar /app/app.jar

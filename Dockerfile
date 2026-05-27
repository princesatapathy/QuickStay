

FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
COPY src/ src/

RUN chmod +x mvnw && ./mvnw -q -DskipTests clean package

FROM eclipse-temurin:21-jre

WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS=""

COPY --from=build /workspace/target/*.jar /app/app.jar

EXPOSE 8080

CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ] && [ -z \"$SPRING_DATASOURCE_URL\" ]; then DB_NO_PROTO=\"${DATABASE_URL#postgresql://}\"; DB_HOST_PATH=\"${DB_NO_PROTO#*@}\"; export SPRING_DATASOURCE_URL=\"jdbc:postgresql://${DB_HOST_PATH}\"; fi; java $JAVA_OPTS -jar /app/app.jar"]

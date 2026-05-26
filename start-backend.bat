@echo off
echo Starting AirBnb Backend...
cd /d %~dp0
set SPRING_PROFILES_ACTIVE=dev
java -jar target\AirBnb-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
pause

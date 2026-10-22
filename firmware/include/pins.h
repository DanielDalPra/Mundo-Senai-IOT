#pragma once
// ESP32 clássico WROOM/DevKit. Não usar esta pinagem em C3/S3 sem adaptar.
constexpr int SPI_SCK=18, SPI_MISO=19, SPI_MOSI=23;
constexpr int OLED_CS=16, OLED_DC=27;
constexpr int RFID_CS=21, RFID_RST=22;
constexpr int US_TRIG=25, US_ECHO=26; // ECHO obrigatoriamente através do divisor!
constexpr int COLOR_S0=32, COLOR_S1=33, COLOR_S2=13, COLOR_S3=14, COLOR_OUT=34;

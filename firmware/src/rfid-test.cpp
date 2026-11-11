// Diagnostico isolado: nao usa presenca, OLED, NVS, rede nem altera tags.
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include "pins.h"

MFRC522 probe(RFID_CS, RFID_RST);

void diagnoseBus() {
  const byte version = probe.PCD_ReadRegister(MFRC522::VersionReg);
  const byte pattern[] = {0x55, 0xAA, 0x00, 0xFF};
  probe.PCD_WriteRegister(MFRC522::CommandReg, MFRC522::PCD_Idle);
  probe.PCD_WriteRegister(MFRC522::FIFOLevelReg, 0x80);
  for (byte value : pattern) probe.PCD_WriteRegister(MFRC522::FIFODataReg, value);
  const byte count = probe.PCD_ReadRegister(MFRC522::FIFOLevelReg);
  bool fifoOk = count == sizeof(pattern);
  Serial.printf("RFID_DIAG versao=0x%02X FIFO_n=%u lido=", version, count);
  for (byte expected : pattern) {
    const byte actual = probe.PCD_ReadRegister(MFRC522::FIFODataReg);
    fifoOk = fifoOk && actual == expected;
    Serial.printf("%02X ", actual);
  }
  Serial.printf("FIFO=%s\n", fifoOk ? "OK" : "FALHA");

  byte data[] = {0x12, 0x34, 0x56};
  uint16_t crc = 0x6363;
  for (byte value : data) {
    byte next = value ^ (crc & 0xFF);
    next ^= next << 4;
    crc = (crc >> 8) ^ (uint16_t(next) << 8) ^ (uint16_t(next) << 3) ^ (next >> 4);
  }
  byte result[2] = {0, 0};
  const auto status = probe.PCD_CalculateCRC(data, sizeof(data), result);
  const bool crcOk = status == MFRC522::STATUS_OK && result[0] == byte(crc) && result[1] == byte(crc >> 8);
  Serial.printf("RFID_DIAG CRC=%s status=%u chip=%02X%02X esperado=%04X\n",
                crcOk ? "OK" : "FALHA", byte(status), result[1], result[0], crc);
  probe.PCD_Init();
}

void setup() {
  Serial.begin(115200);
  pinMode(OLED_CS, OUTPUT); digitalWrite(OLED_CS, HIGH);
  pinMode(RFID_CS, OUTPUT); digitalWrite(RFID_CS, HIGH);
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  probe.PCD_Init();
  Serial.println("RFID ISOLADO: SPI 1 MHz; sem ultrassonico; aproxime uma tag.");
  diagnoseBus();
}

void loop() {
  static uint32_t lastBus = 0;
  if (millis() - lastBus >= 15000) { lastBus = millis(); diagnoseBus(); }
  byte atqa[2] = {0, 0}; byte size = sizeof(atqa);
  const auto status = probe.PICC_WakeupA(atqa, &size);
  Serial.printf("RFID_DIAG WUPA=%u ATQA=%02X%02X", byte(status), atqa[0], atqa[1]);
  if (status == MFRC522::STATUS_OK || status == MFRC522::STATUS_COLLISION) {
    if (probe.PICC_ReadCardSerial()) {
      Serial.print(" UID=");
      for (byte i = 0; i < probe.uid.size; i++) Serial.printf("%02X", probe.uid.uidByte[i]);
      probe.PICC_HaltA(); probe.PCD_StopCrypto1();
    } else Serial.print(" selecao_uid=FALHA");
  }
  Serial.println();
  delay(1000);
}

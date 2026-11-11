// Diagnostico do sinal OUT do TCS3200; nao usa nem altera estoque.
// Testa os pinos de controle e o sinal em 20%, 100% e 2% de escala.
#include <Arduino.h>
#include "pins.h"

struct Scale { const char* name; int s0; int s1; };
struct Filter { const char* name; int s2; int s3; };
const Scale scales[] = {{"20pct", HIGH, LOW}, {"100pct", HIGH, HIGH}, {"2pct", LOW, HIGH}};
const Filter filters[] = {{"red", LOW, LOW}, {"green", HIGH, HIGH}, {"blue", LOW, HIGH}};

void setup() {
  Serial.begin(115200);
  pinMode(OLED_CS, OUTPUT); digitalWrite(OLED_CS, HIGH);
  pinMode(RFID_CS, OUTPUT); digitalWrite(RFID_CS, HIGH);
  for (int pin : {COLOR_S0, COLOR_S1, COLOR_S2, COLOR_S3}) pinMode(pin, OUTPUT);
  pinMode(COLOR_OUT, INPUT);
  Serial.println("TESTE TCS3200: controle de filtros/escala e sinal no GPIO34");
}

void loop() {
  for (const auto& scale : scales) {
    digitalWrite(COLOR_S0, scale.s0); digitalWrite(COLOR_S1, scale.s1);
    for (const auto& filter : filters) {
      digitalWrite(COLOR_S2, filter.s2); digitalWrite(COLOR_S3, filter.s3);
      delay(60);
      const int idle = digitalRead(COLOR_OUT);
      const unsigned long low = pulseIn(COLOR_OUT, LOW, 150000);
      const unsigned long high = pulseIn(COLOR_OUT, HIGH, 150000);
      const uint32_t start = micros();
      int previous = digitalRead(COLOR_OUT), changes = 0, highReads = 0, reads = 0;
      while (micros() - start < 20000) {
        const int current = digitalRead(COLOR_OUT);
        if (current != previous) changes++;
        previous = current; highReads += current == HIGH; reads++;
      }
      Serial.printf("COLOR_DIAG escala=%s filtro=%s S0=%d S1=%d S2=%d S3=%d OUT_inicial=%d low_us=%lu high_us=%lu mudancas_20ms=%d highs=%d/%d\n",
        scale.name, filter.name, digitalRead(COLOR_S0), digitalRead(COLOR_S1),
        digitalRead(COLOR_S2), digitalRead(COLOR_S3), idle, low, high, changes, highReads, reads);
    }
  }
  delay(500);
}

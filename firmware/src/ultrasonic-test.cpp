// Diagnostico HC-SR04: mantem o divisor de tensao no ECHO.
// Nao usa RFID, tela, cor, NVS nem servidor.
#include <Arduino.h>
#include "pins.h"

void setup() {
  Serial.begin(115200);
  pinMode(OLED_CS, OUTPUT); digitalWrite(OLED_CS, HIGH);
  pinMode(RFID_CS, OUTPUT); digitalWrite(RFID_CS, HIGH);
  pinMode(US_TRIG, OUTPUT); digitalWrite(US_TRIG, LOW);
  pinMode(US_ECHO, INPUT);
  Serial.printf("ULTRASSOM ISOLADO TRIG=%d ECHO=%d; manter divisor; alvo plano a 10 cm\n", US_TRIG, US_ECHO);
}

void loop() {
  const int idle = digitalRead(US_ECHO);
  digitalWrite(US_TRIG, LOW); delayMicroseconds(5);
  digitalWrite(US_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(US_TRIG, LOW);
  const unsigned long duration = pulseIn(US_ECHO, HIGH, 40000);
  const int after = digitalRead(US_ECHO);
  Serial.printf("US_DIAG idle=%d final=%d pulso_us=%lu", idle, after, duration);
  if (duration) Serial.printf(" distancia_cm=%.1f\n", duration * 0.0343f / 2.0f);
  else Serial.println(" SEM_ECO");
  delay(500);
}

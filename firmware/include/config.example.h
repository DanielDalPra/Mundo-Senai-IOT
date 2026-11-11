#pragma once
// Copie para config.h. Esse arquivo local está no .gitignore.
#define WIFI_SSID "SEU_WIFI_2G4"
#define WIFI_PASSWORD "SUA_SENHA"
#define SERVER_URL "http://192.168.1.100:3000"
// Mesmo DEVICE_TOKEN do .env; nunca use ADMIN_TOKEN aqui.
#define DEVICE_TOKEN "COPIE_DEVICE_TOKEN_DO_ENV"
#define DEVICE_ID "esp32-maquete-01"
// 1 = relatorios via USB com `npm run usb`; 0 = HTTP pela rede Wi-Fi.
#define TRANSPORT_SERIAL 1

// OLED fotografado: SPI, 6 pinos, sem RESET exposto.
#define OLED_RESET_PIN -1
#define OLED_ENABLED true
#define COLOR_ENABLED true
// Validada com branco, azul, verde e amarelo na caixa em 10/11/2026.
#define COLOR_CALIBRATED true
// Branco na caixa de apresentacao em 10/11: R=225 G=215 B=169 us.
// Ganhos normalizados; recalibrar ao mudar sensor, distância ou iluminação.
// Veja docs/TESTE-COR.md e docs/CALIBRACAO.md.
#define COLOR_GAIN_R 1.0f
#define COLOR_GAIN_G 0.955555556f
#define COLOR_GAIN_B 0.751111111f
// Dominancia minima ajustada com as faces reais azul, verde e amarela.
#define COLOR_DOMINANCE_RATIO 1.10f

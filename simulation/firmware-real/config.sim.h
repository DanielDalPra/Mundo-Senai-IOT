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

// Estação de leitura: ajuste após testar o posicionamento real.
#define PRESENCE_ENTER_CM 4.0f
#define PRESENCE_EXIT_CM 6.0f
// OLED fotografado: SPI, 6 pinos, sem RESET exposto.
#define OLED_RESET_PIN -1
#define OLED_ENABLED true
#define COLOR_ENABLED true
// Branco medido nesta montagem em 02/11/2026: R=108 G=108 B=84 us.
// Ganhos normalizados; recalibrar ao mudar sensor, distância ou iluminação.
// Veja docs/TESTE-COR.md e docs/CALIBRACAO.md.
#define COLOR_GAIN_R 1.0f
#define COLOR_GAIN_G 1.0f
#define COLOR_GAIN_B 0.777778f

// Janela maior para respostas conduzidas pela interface do simulador.
#define SERIAL_REPLY_TIMEOUT_MS 30000

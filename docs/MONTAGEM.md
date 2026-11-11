# Montagem física e ligações

## 1. Conferência das peças

As fotografias enviadas mostram:

| Peça | Identificação / observação |
|---|---|
| Leitor RFID | Placa RC522 / MFRC522, comunicação SPI |
| Sensor de cor | Placa “Color Sensor V443”, família TCS3200 conforme o documento; LEDs e dois cabeçalhos |
| OLED | Seis terminais rotulados VCC, GND, CLK, MOSI, CS, D/C; interface SPI |
| Etiquetas | O grupo confirmou uma tag dentro de cada caixa |
| Controlador | ESP32 informado pelo grupo; variante não visível nessas fotos |

O firmware é para **ESP32 clássico WROOM/DevKit**. Não transfira esta pinagem diretamente para ESP32-C3, S2 ou S3. A placa escolhida deve expor os GPIOs da tabela. O controlador do OLED é tratado como SSD1306 128×64, conforme a documentação fornecida; a fotografia sozinha não confirma o chip.

Materiais adicionais: protoboard, jumpers, cabo USB **de dados** e alimentação USB estável. Etiquetas precisam ser compatíveis com RC522, normalmente ISO/IEC 14443 A / MIFARE / NTAG de 13,56 MHz, e ter UIDs distintos.

## 2. Alimentação

Faça as conexões **com o USB desconectado**.

- ESP32: alimentação pelo USB da placa de desenvolvimento.
- RC522: **3V3**, nunca 5 V.
- OLED: **3V3** neste projeto, com os sinais SPI em 3,3 V.
- TCS3200: **3V3** neste projeto, para manter OUT compatível com o ESP32. O chip suporta 2,7–5,5 V; o módulo e seus LEDs precisam ser verificados na bancada. Se os LEDs ficarem fracos, calibrem com iluminação externa estável. Não mude para 5 V sem adaptar os níveis lógicos.
- Todos os GND devem estar ligados entre si. Confira se os trilhos da protoboard são interrompidos no meio.
- Não alimente o mesmo circuito por fontes distintas em paralelo sem conhecer o circuito de alimentação da placa. Não injete 5 V em GPIO ou no pino 3V3.

## 3. Tabela única de conexões

Os números são **GPIO**, não a posição física do terminal. Siga os rótulos impressos nos módulos; a ordem visual pode mudar entre fabricantes.

| Módulo | Terminal | Ligação no ESP32 / circuito |
|---|---|---|
| OLED SPI | VCC | 3V3 |
| OLED SPI | GND | GND |
| OLED SPI | CLK / D0 | GPIO18, compartilhado com SCK do RC522 |
| OLED SPI | MOSI / D1 | GPIO23, compartilhado com MOSI do RC522 |
| OLED SPI | CS | GPIO16 |
| OLED SPI | D/C / DC | GPIO27 |
| OLED SPI | RESET | Não existe exposto na foto: `OLED_RESET_PIN=-1` |
| RC522 | 3.3V | 3V3 |
| RC522 | GND | GND |
| RC522 | SCK | GPIO18 |
| RC522 | MOSI | GPIO23 |
| RC522 | MISO | GPIO19 |
| RC522 | SDA / SS | GPIO21 (CS do SPI; não é I²C) |
| RC522 | RST | GPIO22 |
| RC522 | IRQ | Sem conexão |
| TCS3200 | VCC | 3V3 |
| TCS3200 | GND | GND |
| TCS3200 | S0 | GPIO32 |
| TCS3200 | S1 | GPIO33 |
| TCS3200 | S2 | GPIO13 |
| TCS3200 | S3 | GPIO14 |
| TCS3200 | OUT | GPIO34 (somente entrada) |
| TCS3200 | LED | 3V3 para habilitação no módulo mostrado; confirme o comportamento na bancada |

A placa de cor fotografada tem VCC e GND repetidos nos cabeçalhos. Use uma alimentação comum de 3,3 V; não misture tensões nesses pinos. Se houver um módulo diferente com OE, confirme sua folha de dados antes de conectá-lo; a placa fotografada expõe **LED**, não OE.

OLED e RC522 compartilham apenas CLK e MOSI. Cada um tem seu próprio CS. Use fios curtos, preferencialmente até aproximadamente 15–20 cm para o SPI durante os primeiros testes.

## 4. Retirada do ultrassônico

O firmware atual não usa o HC-SR04. Desligue USB e outras fontes antes de retirar seus quatro fios e os resistores do divisor. Preserve as conexões de alimentação e GND compartilhadas pelos outros módulos. GPIO25 e GPIO26 ficam sem uso neste projeto.

## 5. Estação de leitura

Monte uma pequena estação de leitura à frente do depósito:

1. Fixe o RC522 sob uma base fina de papelão ou ao lado da caixa. A tag dentro da caixa deve ficar próxima e aproximadamente paralela à antena do leitor. Teste a distância real; não conte com leitura através de toda a estante.
2. Aponte o sensor de cor para uma área colorida uniforme da mesma caixa. Comece com distância curta, aproximadamente 1–2 cm, e ajuste conforme a resposta do módulo. Uma pequena cobertura ajuda a manter a luz constante.
3. Deixe o OLED visível na fachada. O ESP32 e a protoboard podem ficar atrás, com acesso ao USB.
4. Marque A1, A2, A3 na prateleira superior e B1, B2, B3 na inferior, da esquerda para a direita vistas de frente.

O RFID identifica uma caixa apresentada na estação, não a ocupação das vagas. Após confirmar uma entrada, coloque fisicamente a caixa na vaga escolhida. Se alguém mudar uma caixa sem registrar, use a correção manual auditada e confira a maquete.

## 6. O que mudou em relação ao DOCX original

| Sinal | Documento anterior | Firmware deste repositório |
|---|---|---|
| OLED CS | GPIO4 | GPIO16 |
| RC522 CS | GPIO12 | GPIO21 |
| RC522 RST | GPIO14 | GPIO22 |
| TCS S2 | GPIO25 | GPIO13 |
| TCS S3 | GPIO13 | GPIO14 |

As mudanças evitam depender de GPIO12 e GPIO15 durante o boot do ESP32 clássico e separam os sinais sem conflitos. O GPIO34 continua sendo usado somente como entrada. **Não misture a tabela antiga com o novo firmware.** O arquivo original está preservado em `referencias/` e não foi alterado.

## 7. Referências técnicas

- [Espressif: datasheet ESP32](https://documentation.espressif.com/esp32_datasheet_en.html) — pinos, limites elétricos e strapping.
- [NXP: MFRC522](https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf) — interface RFID e alimentação.
- [ams OSRAM: TCS3200](https://ams-osram.com/products/sensor-solutions/ambient-light-color-spectral-proximity-sensors/ams-tcs3200-color-sensor) — chip e faixa de alimentação; não substitui a conferência da placa genérica.
- [Adafruit SSD1306](https://github.com/adafruit/Adafruit_SSD1306) — display SPI e reset opcional.

As imagens identificam os módulos, mas não certificam o circuito interno de cada placa genérica. As ligações foram projetadas e documentadas; a montagem física ainda precisa ser testada pelo grupo.

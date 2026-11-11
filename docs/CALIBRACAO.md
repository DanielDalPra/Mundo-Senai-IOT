# Calibração e diagnóstico

## Estação de leitura

O ultrassônico não é usado. Apresente uma tag por vez ao RC522 e afaste-a por pelo menos dois segundos antes de uma nova leitura. O painel indica uma tag próxima, não a ocupação das prateleiras.

O OLED e o painel mostram a leitura de cor independentemente do RFID. Sem uma caixa diante do sensor, a leitura pode corresponder ao fundo da estação.

## Identificação RFID

A identidade vem do UID da tag, não da cor. Posicione a etiqueta interna perto da face da caixa que encosta no leitor, sem metal entre a tag e a antena. Evite duas tags sobre o RC522 ao mesmo tempo.

UIDs são cadastrados na aba Tags. O servidor aceita 4, 7 ou 10 bytes, com letras hexadecimais, removendo espaços, `:` e `-`. Duas caixas não podem usar o mesmo UID. O cadastro é uma identificação de protótipo; UID não deve ser tratado como autenticação antifraude.

## Sensor de cor

O exemplo atual inclui os ganhos medidos na caixa em 10/11/2026:
R=1, G=0,955555556 e B=0,751111111, com dominância mínima de 1,10.
Eles equilibram o branco dessa montagem, sem garantir
outra iluminação ou posicionamento. Para testar sem ultrassônico, seguir
[TESTE-COR.md](TESTE-COR.md).

O sinal OUT do TCS3200 é uma onda de frequência relacionada à intensidade luminosa. `pulseIn(LOW)` mede a **duração do pulso em microssegundos**. Pulso mais curto implica frequência maior. O código original chamou essas durações de frequência; o novo código mantém os valores como pulsos para evitar confusão.

O firmware usa a escala de 20%: S0 alto, S1 baixo. Filtros: vermelho LOW/LOW, verde HIGH/HIGH, azul LOW/HIGH. Cada canal coleta 15 pulsos, aceita até três sem sinal e calcula a média após descartar 20% de cada extremo. Menos de 12 pulsos válidos em um canal produz `indefinida`; após duas leituras sem sinal, o código solicita retomada da escala.

1. Fixe iluminação e distância. Deixe o sensor apontado para uma área uniforme, sem etiqueta branca.
2. Coloque um cartão branco na posição de leitura. A leitura da cor independe da presença ultrassônica.
3. No monitor serial, anote R, G e B de pelo menos dez leituras estáveis. Use a mediana de cada canal.
4. Coloque essas durações como ganhos. Exemplo **ilustrativo**, que deve ser substituído pelos valores medidos:

```cpp
#define COLOR_GAIN_R 120.0f
#define COLOR_GAIN_G 145.0f
#define COLOR_GAIN_B 98.0f
```

5. Grave novamente e teste azul, verde e amarelo. O código calcula `ganho / pulso`, procurando dominância de um canal ou vermelho+verde para amarelo.
6. Repita sob a iluminação da apresentação. Habilite `COLOR_CALIBRATED true` somente depois de conferir as cores reais. A regra é simples e não substitui uma calibração por amostras das caixas; se houver ambiguidade, aceite `indefinida`.

Cor não bloqueia a entrada nem escolhe a caixa. Há várias caixas azuis/verdes, então essa leitura não distingue itens. Se não conseguirem estabilizar o módulo, use `COLOR_ENABLED false` temporariamente e mantenha o RFID funcionando.

## Problemas frequentes

| Sintoma | Verificação |
|---|---|
| ESP32 reinicia ao conectar sensores | Curto, 5 V no GPIO/3V3, fonte/cabo, GND comum |
| Porta COM não aparece | Cabo somente carga, driver USB, porta do computador |
| RFID versão 0x00/0xFF | 3V3, CS21, RST22, MOSI23, MISO19, SCK18; não usar pinagem antiga |
| Tag não lida | Tag longe, metal, antenas desalinhadas ou tag incompatível |
| Primeira leitura funciona e a segunda não | Afaste a tag por pelo menos dois segundos e apresente novamente |
| OLED apagado | VCC/GND, CS16, DC27, CLK18, MOSI23; confirme controlador SSD1306 e resolução |
| Cor sempre indefinida | OUT34, alimentação, S0/S1, filtros, iluminação e pulsos iguais/zero |
| Wi-Fi conecta mas painel não recebe | IP/porta, firewall, isolamento do roteador e SERVER_URL sem localhost |
| HTTP 401/403 | DEVICE_TOKEN ou DEVICE_ID diferentes entre .env e config.h |
| Operação expirada | Prepare novamente, aguarde o OLED, retire e reapresente a caixa |
| 3D não confere com a maquete | Movimento fora do fluxo; faça correção manual com motivo |
| Tela 3D vazia | Habilite aceleração gráfica; tente Chrome/Edge; verifique WebGL |

O campo OLED OK da telemetria representa o retorno de inicialização da biblioteca, não uma inspeção visual da tela. O campo RFID OK indica resposta do registrador do leitor, não garante a leitura de qualquer tipo de tag.

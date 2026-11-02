# Calibração e diagnóstico

## Presença na estação

O HC-SR04 é amostrado aproximadamente a cada 200 ms, sujeito ao tempo de rede e de leitura dos demais sensores. São necessárias duas amostras próximas para entrar em presença, e três amostras distantes ou sem eco para liberar. Existe histerese: a região entre 4 e 6 cm mantém o estado anterior.

Em `firmware/include/config.h`:

```cpp
#define PRESENCE_ENTER_CM 4.0f
#define PRESENCE_EXIT_CM 6.0f
```

Use um batente inicialmente a cerca de 3 cm. Não encoste a caixa nos transdutores. Se o sensor não obtiver eco, a API recebe `distanceCm: null`; o firmware não transforma timeout em zero centímetro nem em presença.

Confirme dez inserções e dez retiradas. Ajuste as distâncias mantendo saída maior que entrada. Se um módulo falhar na distância muito curta, afaste o batente e reajuste os dois limiares. Não use mãos ou quinas como único alvo na calibração: prefira a face real da caixa.

## Identificação RFID

A identidade vem do UID da tag, não da cor. Posicione a etiqueta interna perto da face da caixa que encosta no leitor, sem metal entre a tag e a antena. Evite duas tags sobre o RC522 ao mesmo tempo.

UIDs são cadastrados na aba Tags. O servidor aceita 4, 7 ou 10 bytes, com letras hexadecimais, removendo espaços, `:` e `-`. Duas caixas não podem usar o mesmo UID. O cadastro é uma identificação de protótipo; UID não deve ser tratado como autenticação antifraude.

## Sensor de cor

O exemplo atual inclui os ganhos medidos na montagem em 02/11/2026:
R=1, G=1 e B=0,777778. Eles equilibram o branco dessa montagem, sem garantir
outra iluminação ou posicionamento. Para testar sem ultrassônico, seguir
[TESTE-COR.md](TESTE-COR.md).

O sinal OUT do TCS3200 é uma onda de frequência relacionada à intensidade luminosa. `pulseIn(LOW)` mede a **duração do pulso em microssegundos**. Pulso mais curto implica frequência maior. O código original chamou essas durações de frequência; o novo código mantém os valores como pulsos para evitar confusão.

O firmware usa a escala de 20%: S0 alto, S1 baixo. Filtros: vermelho LOW/LOW, verde HIGH/HIGH, azul LOW/HIGH. Timeout em qualquer canal produz `indefinida`.

1. Fixe iluminação e distância. Deixe o sensor apontado para uma área uniforme, sem etiqueta branca.
2. Coloque um cartão branco na posição de leitura, com a estação detectando presença.
3. No monitor serial, anote R, G e B de pelo menos dez leituras estáveis. Use a mediana de cada canal.
4. Coloque essas durações como ganhos. Exemplo **ilustrativo**, que deve ser substituído pelos valores medidos:

```cpp
#define COLOR_GAIN_R 120.0f
#define COLOR_GAIN_G 145.0f
#define COLOR_GAIN_B 98.0f
```

5. Grave novamente e teste azul, verde e amarelo. O código calcula `ganho / pulso`, procurando dominância de um canal ou vermelho+verde para amarelo.
6. Repita sob a iluminação da apresentação. A regra é simples e não substitui uma calibração por amostras das caixas; se houver ambiguidade, aceite `indefinida`.

Cor não bloqueia a entrada nem escolhe a caixa. Há várias caixas azuis/verdes, então essa leitura não distingue itens. Se não conseguirem estabilizar o módulo, use `COLOR_ENABLED false` temporariamente e mantenha o RFID funcionando.

## Problemas frequentes

| Sintoma | Verificação |
|---|---|
| ESP32 reinicia ao conectar sensores | Curto, 5 V no GPIO/3V3, fonte/cabo, GND comum |
| Porta COM não aparece | Cabo somente carga, driver USB, porta do computador |
| RFID versão 0x00/0xFF | 3V3, CS21, RST22, MOSI23, MISO19, SCK18; não usar pinagem antiga |
| Tag não lida | Caixa não detectada; tag longe, metal, antenas desalinhadas ou tag incompatível |
| Primeira leitura funciona e a segunda não | Retire a caixa da estação por cerca de um segundo; confirme presença “Livre” |
| OLED apagado | VCC/GND, CS16, DC27, CLK18, MOSI23; confirme controlador SSD1306 e resolução |
| Ultrassônico sempre sem eco | ECHO com divisor correto, 5 V no módulo, alvo/posição e GND |
| Cor sempre indefinida | OUT34, alimentação, S0/S1, filtros, iluminação e pulsos iguais/zero |
| Wi-Fi conecta mas painel não recebe | IP/porta, firewall, isolamento do roteador e SERVER_URL sem localhost |
| HTTP 401/403 | DEVICE_TOKEN ou DEVICE_ID diferentes entre .env e config.h |
| Operação expirada | Prepare novamente, aguarde o OLED, retire e reapresente a caixa |
| 3D não confere com a maquete | Movimento fora do fluxo; faça correção manual com motivo |
| Tela 3D vazia | Habilite aceleração gráfica; tente Chrome/Edge; verifique WebGL |

O campo OLED OK da telemetria representa o retorno de inicialização da biblioteca, não uma inspeção visual da tela. O campo RFID OK indica resposta do registrador do leitor, não garante a leitura de qualquer tipo de tag.

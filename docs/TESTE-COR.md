# Teste separado do TCS3200

Quando o ultrassônico ainda não está montado, usar o ambiente de bancada:

```powershell
pio run -d firmware -e esp32dev-color-test -t upload --upload-port COM14
```

Fechar a ponte USB e qualquer monitor serial antes de gravar. O monitor serial
funciona a 115200 baud. A tela mostra `TESTE SENSOR DE COR`, a classificação e
as durações dos pulsos R/G/B em microssegundos. Aproximar uma superfície colorida
uniforme a cerca de 1–2 cm, com iluminação constante.

Nesse ambiente, o firmware lê cor sem exigir presença, não lê RFID e não envia
relatórios/movimentos ao servidor. O painel de estoque pode mostrar a placa
offline; isso é esperado nesse teste. O ambiente padrão continua `esp32dev`.

Em 02/11/2026 a gravação desse ambiente na COM14 foi concluída com hash verificado.
O sensor físico retornou pulsos não nulos nos três filtros, aproximadamente
R=698–724, G=893–925 e B=802–821 µs, sem uma referência de cor posicionada pelo
operador. A classificação foi `indefinida`; essa leitura comprova resposta de
pulsos, mas ainda não valida a identificação/calibração das cores das caixas.

O teste nativo `color-bench` confirma leitura sem ultrassônico e ausência de
relatórios/movimentos no modo de bancada. Os testes existentes do firmware
também passaram depois dessa alteração.

Para voltar à operação completa, gravar explicitamente:

```powershell
pio run -d firmware -e esp32dev -t upload --upload-port COM14
npm run usb -- --port COM14
```

Calibração: [CALIBRACAO.md](CALIBRACAO.md).

## Referência de branco aplicada em 02/11/2026

O papel branco forneceu medianas R=108, G=108 e B=84 µs em 13 leituras.
Os ganhos normalizados correspondentes foram gravados na placa e no arquivo de
exemplo, sem incluir as credenciais locais:

```cpp
#define COLOR_GAIN_R 1.0f
#define COLOR_GAIN_G 1.0f
#define COLOR_GAIN_B 0.777778f
```

Antes desse ajuste, uma sequência da caixa azul foi classificada azul em 13/13
leituras. A sequência verde deu indefinida em 13/13; isso motivou a medição do
branco. Após o ajuste, sete leituras de branco ficaram indefinidas, comportamento
esperado por não existir categoria branco. O operador posteriormente informou
que tudo funcionou; não foi capturada outra sequência serial da caixa verde.
Esses ganhos pertencem à montagem/iluminação usada no teste e devem ser
recalibrados se ela mudar. Dados brutos: [referência de branco](calibracao/tcs3200-branco-2026-11-02.json).

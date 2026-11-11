# Teste separado do TCS3200

## Calibração da caixa em 10/11/2026

Com os quatro LEDs acesos e o papel branco confirmado a 1–2 cm, 13 amostras
resultaram nas medianas R=225, G=215 e B=169 us. Ganhos normalizados:
R=1, G=0,955555556 e B=0,751111111; dominância de canal=1,10.

As faces azul, verde e amarela produziram 13 amostras válidas cada. Repetidas
no código C++ com os ganhos novos, todas foram classificadas conforme a cor;
as 13 amostras de branco ficaram indefinidas. Houve uma leitura de amarelo
sem sinal entre as 13 válidas. Após gravar os ganhos na placa, outras sete
leituras amarelas foram reconhecidas corretamente no teste exclusivo.

Na conferência posterior da face verde, somente 2/7 leituras vieram como verde;
as outras cinco ficaram sem sinal. Uma observação seguinte teve 14/14 leituras
sem sinal, apesar das tentativas automáticas de retomada da escala. Portanto,
os ganhos foram aplicados, mas o sinal físico ainda é intermitente; não é
correto considerar o verde validado de forma contínua. Os resultados estão em
`tcs3200-verde-validacao-final-*` e `tcs3200-verde-observacao-*`.

O firmware coleta 15 pulsos por canal, aceita até três ausentes, descarta
20% de cada extremo e usa a média central; com menos de 12 pulsos válidos,
mantém a cor indefinida. Se duas leituras consecutivas falharem, solicita
retomada da saída alternando a escala S0/S1, sem supor sucesso. Essa tentativa
não substitui a correção de uma conexão ou módulo defeituoso.

Arquivos `calibracao/*caixa*2026-11-10*.json`, `*verde-retomada*` e
`*amarelo-validacao-final*` preservam as amostras, inclusive as perdas.
O teste `test:firmware` repete as 52 leituras filtradas selecionadas. Revalidar
se a iluminação ou a posição mudar. As seções abaixo registram etapas anteriores.

## Montagem na caixa em 10/11/2026: diagnostico de sinal

**Estado posterior:** a pedido do operador, o programa completo e a
calibracao de 03/11 foram restaurados. A calibracao proposta em 10/11 nao foi
aplicada; a leitura de cor na caixa precisa de validacao quando conveniente.
Os paragrafos seguintes descrevem o diagnostico anterior a essa restauracao.

Apos a montagem, os LEDs acenderam, mas o teste de cor registrou R/G/B zerados.
O operador conferiu OUT no GPIO34 e, depois de reconectar, os pulsos voltaram.
O branco estabilizou com medianas R=225, G=215 e B=169 us; os ganhos propostos
sao R=1, G=0,955555556 e B=0,751111111. Com esses ganhos, as 13 amostras da
face azul foram classificadas como azul. Na tentativa da face verde, o sinal
voltou a ficar ausente; essa calibracao nao foi habilitada no programa completo.

Para investigar o sinal, foi criado um teste independente:

```powershell
pio run -d firmware -e esp32dev-color-signal-test -t upload --upload-port COM7
pio device monitor --port COM7 --baud 115200
```

Feche a ponte USB antes de gravar ou abrir o monitor. O teste percorre os
filtros vermelho, verde e azul e as escalas de 20%, 100% e 2%, lendo pulsos
altos/baixos no GPIO34 com timeout de 150 ms e contando transicoes por 20 ms.
Nao acessa o servidor, o estoque, o RFID nem a tela. A leitura dos pinos de
controle confirma o nivel no GPIO da ESP32, nao a continuidade do fio ate o
sensor. O resultado em `calibracao/tcs3200-sinal-escalas-2026-11-10-*.json`
mostrou GPIO34 baixo, sem transicoes observadas, em todas as combinacoes.

O operador informou que nao havia jumper sobressalente; foi proposto usar o
fio D/C da tela temporariamente em OUT–GPIO34. A tela fica desconectada durante
o teste. Apos terminar, restaurar a ligacao da tela ou substituir o jumper e
gravar o ambiente completo `esp32dev` antes de voltar a usar o painel. Medir
verde e amarelo e conferir leituras fisicas com a nova calibracao antes de
habilitar `COLOR_CALIBRATED`. Ver `validacao-2026-11-10.md` para o estado da
bancada e preservar as referencias de 03/11 como historico.

## Calibração no SENAI em 03/11/2026

O operador posicionou papel branco fosco e as faces azul, verde e amarela das
caixas, mantendo os quatro LEDs acesos. As primeiras coletas de branco variaram
muito e não foram usadas como referência. O programa passou a medir 15 pulsos
por filtro, separados por 2 ms, descartar os três menores e os três maiores e
calcular a média dos nove centrais. Timeout continua produzindo zero/indefinida.

Na coleta de branco após esse ajuste, as medianas foram R=2440, G=2793,
B=2369 us; variação relativa por canal de 4,5%, 2,5% e 2,4%.
Ganhos normalizados: R=0,873612603; G=1; B=0,848191908.
O limite de dominância de canal foi ajustado de 1,20 para 1,10 para reconhecer
o verde real, mantendo a regra de amarelo.

Os arquivos em `docs/calibracao/*2026-11-03*.json` preservam todas as coletas,
inclusive as instáveis e a primeira tentativa de verde. O teste nativo executa
o código original sobre as 52 amostras selecionadas (13 de cada referência):
branco → indefinida; azul → azul; verde da repetição estável → verde;
amarelo → amarelo. Todos esses resultados passaram no computador.
Essa repetição verifica a implementação com os dados usados na calibração;
novas leituras após gravar são necessárias para validar a placa.

Após gravar os novos ganhos e o limite de dominância no ESP32, foram coletadas
novas sequências: **7/7 amarelo e 7/7 verde**, classificadas pelo próprio firmware
físico. Dados em `tcs3200-amarelo-verificacao-2026-11-03-*.json` e
`tcs3200-verde-verificacao-2026-11-03-*.json`. O exemplo foi então atualizado para
`COLOR_CALIBRATED true`, específico desta montagem. O azul teve 13/13 nas amostras
físicas avaliadas com os ajustes e na repetição pelo código C++ no computador;
não houve uma nova sequência azul depois da gravação final.

Para uma montagem diferente, validar as cores e a distância novamente antes
de habilitar `COLOR_CALIBRATED`. Alterar luz/posição pode exigir recalibração.
O teste exclusivo de cor classifica durante a calibração mesmo com esse
parâmetro desabilitado; o programa completo o respeita.

Os registros de 02/11 abaixo descrevem a calibração anterior.

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

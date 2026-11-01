# Estoque Inteligente — simulação Wokwi

Arquivos para um circuito ESP32 completo e interativo. Esta pasta é independente
do firmware de produção e não contém credenciais reais.

## Componentes

- ESP32 DevKit clássico, RC522 e HC-SR04 nativos do Wokwi.
- TCS3200 customizado: gera pulsos em OUT conforme os filtros S2/S3, escala
  S0/S1 e seletor de cor virtual. Não simula óptica, iluminação ou calibração.
- OLED SPI customizado: interpreta o subconjunto de comandos SSD1306 usado pela
  biblioteca Adafruit, mostrando o framebuffer 128×64. Não é um modelo elétrico
  completo do controlador nem comprova a compatibilidade do display físico.
- Protoboard com barramentos 3V3, 5 V e GND; entrada do ECHO na linha 25 e
  saída para GPIO26 na linha 27.
- Divisor ECHO de 2,2 kΩ + 3,3 kΩ representado por um bloco comportamental
  com desenho dos dois resistores. O bloco transmite o nível lógico do pulso,
  sem resolver a divisão de tensão. Não usar essa simulação como teste elétrico:
  a montagem física exige os dois resistores conforme `docs/MONTAGEM.md`.

## Importação

Em um projeto ESP32 do Wokwi, importar estes nove arquivos:
`sketch.ino`, `diagram.json`, `libraries.txt`, `tcs3200.chip.c`,
`tcs3200.chip.json`, `oled-spi.chip.c`, `oled-spi.chip.json`,
`echo-divider.chip.c`, `echo-divider.chip.json`.

Remover antes o `sketch.ino` e `diagram.json` vazios do projeto novo, pois o
importador não sobrescreve arquivos com nomes existentes. Se aparecer erro do
diagrama durante a importação, clicar Retry após todos os arquivos carregarem.

## Uso

1. Iniciar simulação. O ultrassônico começa a 3 cm.
2. A entrada da CX-01 em A1 fica preparada por 60 segundos.
3. Clicar no RC522, escolher Blue Card e Tap. O OLED e a serial devem confirmar.
4. Para nova apresentação, ajustar o HC-SR04 a 10 cm por um segundo e voltar a
   3 cm. Esse ciclo representa retirar/recolocar uma caixa na estação.
5. No monitor serial, enviar `mover 1 B2`, `saida 1` ou `entrada 1 A1` e
   apresentar novamente a tag correta. Se houver operação pendente, enviar
   `cancelar` antes. `estoque` lista as posições, `ajuda` mostra os comandos.
6. Clicar no modelo TCS3200 e ajustar cor: 0 azul, 1 verde, 2 vermelho,
   3 amarelo, 4 neutro. A cor não identifica a caixa.

Tags fictícias, apenas para esta simulação:

| Caixa | Preset RFID | UID |
|---|---|---|
| CX-01 | Blue Card | 01020304 |
| CX-02 | Green Card | 11223344 |
| CX-03 | Yellow Card | 55667788 |
| CX-04 | Red Card | AABBCCDD |
| CX-05 | NFC Tag | 04112233445566 |
| CX-06 | Key Fob | C0FFEE99 |

## Escopo e estado de validação

Este firmware implementa preparação de operação, prazo de 60 segundos,
verificação de presença, identificação por RFID, rejeição de tag errada e vaga
ocupada, entrada, saída e transferência. O estoque fica na RAM e reinicia vazio.
Não se conecta ao servidor local, não atualiza o painel 3D e não replica a
persistência ou autenticação de produção.

Validação executada em 01/11/2026:

- Firmware ESP32 compilou no PlatformIO e no Wokwi.
- Os três modelos customizados compilaram e executaram no Wokwi.
- RC522 respondeu versão `0x92` e leu Blue Card (`01020304`) e Green Card
  (`11223344`). A tag verde foi recusada ao esperar CX-01.
- HC-SR04 em 3 cm produziu aproximadamente 2,9 cm; em 10 cm, aproximadamente
  10,3 cm. A presença foi liberada após afastamento, permitindo nova leitura.
- Azul, verde, vermelho, amarelo e neutro foram classificados a partir dos
  pulsos do modelo TCS3200. Neutro retornou `indefinida`.
- OLED SPI exibiu distância, cor, operação e ocupação.
- Entrada CX-01 em A1, transferência para B2 e saída confirmadas por RFID.
- Vaga ocupada e operação concorrente recusadas. Estoque começa vazio.
- Depois da organização final, distância, cores, tag errada e entrada em A1
  foram conferidas novamente com o divisor em bloco e conexões via protoboard.

Captura da montagem final: `circuito-testado.png`. O projeto ficou aberto no
navegador, sem publicação. Salvar um link não listado exige plano pago no Wokwi;
a publicação pública foi bloqueada pela revisão automática por falta de
autorização explícita. O ZIP local preserva os nove arquivos necessários.

Esses testes validam o comportamento simulado. Não comprovam alimentação,
alcance RFID, calibração óptica, tolerância de resistores ou montagem física.

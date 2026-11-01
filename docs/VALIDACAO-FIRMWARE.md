# Validação do firmware original — 01/11/2026

Resultado: **44 testes/casos aprovados**, mais compilação para ESP32.
Isso aprova os comportamentos abaixo dentro dos limites descritos; não representa
certificação elétrica nem funcionamento de sensores ainda incompletos.

A correção nova compilou com 25.676 bytes de RAM e 325.565 bytes de flash.
A primeira tentativa de gravação falhou com `Wrong boot mode detected (0x17)`.
A segunda tentativa automática **gravou com sucesso**, verificou o hash da imagem
e reiniciou a placa. A ponte USB foi reaberta na COM14 após essa gravação.

| Camada | Quantidade | Resultado |
| --- | ---: | --- |
| Servidor, persistência, HTTP e primeira integração USB | 17 | Aprovados |
| Ponte Python com falhas de rede e respostas inválidas | 12 | Aprovados |
| Funções do firmware C++ original em execução no PC | 11 | Aprovados |
| Firmware original → ponte Python → servidor real isolado | 3 | Aprovados |
| Caminho HTTP/Wi-Fi do firmware com rede substituída em teste | 1 | Aprovado |

## O que foi executado

O programa em `test/firmware-host/main.cpp` **inclui diretamente
`firmware/src/main.cpp`**. Não é uma reimplementação da lógica do projeto.
Ele usa a mesma biblioteca ArduinoJson 6.21.5 do build ESP32.
Somente as interfaces de hardware, o relógio, o armazenamento NVS e o cliente
HTTP são substituídos por implementações controláveis para execução no PC.

Os três testes completos usam esse executável, a ponte Python original e uma
instância real do servidor Node, com autenticação e persistência em diretório
temporário. Não usam o estoque da demonstração nem fabricam leituras no painel
conectado ao ESP32 físico.

Foram confirmados:

- Duas amostras próximas para presença; três distantes para liberar nova visita.
- Histerese, falta de eco e bloqueio de leituras repetidas na mesma visita.
- Classificação de pulsos azul, verde, vermelho, amarelo, neutro e timeout.
- UID com zero inicial, comando ativo e armazenamento de leitura pendente.
- Versões reconhecidas do RC522 e rejeição de respostas inválidas do leitor.
- Entrada em A1, transferência para B2 e saída com a tag correta.
- Tag de outra caixa sem alteração da posição registrada.
- Operações canceladas e expiradas sem movimentação indevida.
- Perda de confirmação, reenvio com o mesmo evento e deduplicação no servidor.
- Recuperação de evento persistido após reinício simulado.
- Confirmação com ID de requisição errado ou atrasada sem apagar evento pendente.
- Mensagem inválida, resposta longa, falha de autenticação, rede e timeout.
- Preservação da leitura diante de erros HTTP; confirmação válida limpa a pendência.

## Correção encontrada

O teste `oversized-reply` falhou antes da correção: ao receber uma linha USB acima
do limite, o parser limpava o buffer e podia interpretar o restante da mesma linha
como uma confirmação válida. Agora ele descarta a linha inteira até a quebra de
linha. O teste permaneceu na suíte para evitar regressão.

## Como reproduzir

Requisitos: Node.js 24+, Python 3, compilador C++ com suporte a C++11 (`g++` por
padrão; pode selecionar outro pelo ambiente `CXX`) e dependências PlatformIO.

```powershell
pio run -d firmware
npm test
python -m unittest discover -s test -p usb_bridge_test.py -v
npm run test:firmware
```

O primeiro comando instala/resgata a biblioteca usada pelos testes nativos e
compila para ESP32. O último compila duas variantes de teste no PC, USB e Wi-Fi.
Executáveis são gerados em `test/firmware-host/.build`, ignorado pelo Git.
Depois de preparar as dependências, `npm run validate` executa as três suítes
em sequência e para se qualquer uma falhar.

## Limites e montagem real

- O teste nativo não emula pulsos elétricos, barramento SPI, alimentação,
  temporização do ESP32, memória flash ou alcance RF. As entradas são controladas.
- A recuperação usa um substituto de NVS; não prova resistência a uma queda de
  energia durante uma gravação real na flash.
- O teste HTTP/Wi-Fi substitui o cliente de rede; não comprova acesso pelo hotspot.
  A comunicação física validada utiliza USB.
- O OLED tem inicialização reportada pelo firmware, mas isso não comprova imagem
  visível no display físico.
- A leitura física anterior apresentou RFID sem resposta e ultrassônico sem eco.
  Ainda é necessário completar/conferir as ligações e calibrar o TCS3200.
- A simulação Wokwi anteriormente entregue usa um sketch independente. Esses
  resultados novos vêm do firmware original executado no PC, não desse sketch.

O divisor do ECHO continua obrigatório na montagem real; nenhum teste de software
comprova seu comportamento elétrico. Ver [USB.md](USB.md) e
[CALIBRACAO.md](CALIBRACAO.md) para operação e bancada.

# Validação e teste de bancada

## Atualização — 02/11/2026

`npm run validate` aprovou **45 testes/casos**, incluindo o novo `color-bench`:
leitura de cor sem ultrassônico, sem leitura RFID e sem relatórios ao estoque.
O modo de bancada foi gravado no ESP32, o OLED foi confirmado pelo operador e
foram capturados pulsos reais do TCS3200. A referência de branco, os ganhos
aplicados e os limites da validação estão em [TESTE-COR.md](TESTE-COR.md).

## Atualização — 01/11/2026

Validação ampliada: **44 testes/casos aprovados**, incluindo execução das funções
do firmware C++ original no PC e três fluxos completos até o servidor real isolado.
Foi corrigido o descarte de linhas USB longas. Método, comandos e limitações em
[VALIDACAO-FIRMWARE.md](VALIDACAO-FIRMWARE.md).

O firmware original ganhou transporte USB para a mesma API autenticada.
Foi compilado e gravado no ESP32 físico da COM14. A ponte e o servidor real
confirmaram `deviceOnline: true` e `servidor=ok` na serial. Os 17 testes passaram,
incluindo a nova integração Python/HTTP com entrada, reenvio deduplicado e saída.

A placa física reportou `rfidOk: false` e ausência de eco no ultrassônico.
O usuário informou dois cabos ausentes no leitor RFID. Não considerar sensores
ou montagem física aprovados. Detalhes e execução em [USB.md](USB.md).

As seções seguintes registram a validação da entrega anterior, antes desse teste
na placa física.

## Executado nesta entrega

### Servidor: 16 testes automatizados aprovados

Comando: `npm test`, usando Node.js 24.

- Estado inicial vazio, sem presumir as posições físicas das fotos.
- UID válido, normalização e unicidade entre caixas.
- Leitura de tag desconhecida sem movimentação.
- Entrada, mudança de vaga e saída com a tag esperada.
- Bloqueio de vaga ocupada, operação concorrente e cadastro alterado durante ocupação.
- Reenvio de evento sem movimento duplicado.
- Expiração, cancelamento e comando antigo.
- Leitura sem operação e leitura sem presença.
- Cor amarela como telemetria complementar, sem substituir UID.
- Persistência após reinício e cancelamento de comando pendente.
- Correção manual auditada e conflito de vaga.
- Rejeição de payload sem alterar o arquivo persistente.
- Separação entre chaves de painel/dispositivo e cookie de sessão.
- Proteção contra escrita com origem diferente e JSON inválido/grande.
- Entrega do modelo 3D e restrição de arquivos fora de `public`.
- Fluxo HTTP completo e conexão SSE.

### Navegador: fluxo integrado aprovado

Executado no Edge com um cliente HTTP simulando o ESP32:

1. Login administrativo.
2. Leitura de UID desconhecido, uso da última leitura e cadastro da tag.
3. Preparação de entrada, leitura com o comando recebido e confirmação.
4. Atualização por SSE e posição A1 confirmada no estado do modelo 3D.
5. Tentativa de retirada manual no modo conectado rejeitada.
6. Saída confirmada por leitura e caixa fora da estante no 3D.
7. Layout em 1440 px e 390 px, sem rolagem horizontal da página.
8. Logout.

O modo manual independente também foi validado sem acesso à rede: retirada/colocação por botões e arraste, vaga ocupada, transferência entre vagas, salvamento, restauração, câmera, teto e exportação GLB.

### Documentação e modelo

O manual PDF possui oito páginas, renderizadas e revisadas visualmente. O arquivo GLB foi validado quanto ao cabeçalho, tamanho e presença dos grupos das seis caixas e seis vagas. Ele contém 168 nós e 149 malhas.

### Firmware

Compilação local aprovada com PlatformIO, ambiente `esp32dev`, plataforma `espressif32@6.12.0` e framework Arduino ESP32 2.0.17. Foram usadas as versões de bibliotecas fixadas no `platformio.ini`.

- Resultado: **SUCCESS**, com geração de `firmware.elf` e `firmware.bin`.
- Compilação sem credenciais, usando `config.example.h`: 46.436 bytes de RAM (14,2%) e 816.909 bytes de flash (62,3% da partição de aplicativo).
- Compilação com `config.h` local também aprovada: 46.436 bytes de RAM e 816.941 bytes de flash. Credenciais locais não foram incluídas no repositório.
- O script `select_config.py` seleciona o arquivo local `include/config.h` somente se ele existir neste projeto, evitando confusão com arquivos `config.h` internos do SDK.
- Binários compilados não são versionados, pois devem ser gerados com a configuração de cada instalação e podem conter credenciais.

## O que NÃO foi validado fisicamente

Não houve acesso USB ao ESP32 do grupo, gravação da placa, medição elétrica, teste de alcance das tags, calibração dos sensores nem confirmação do controlador interno do OLED. Compilar não comprova essas condições.

## Roteiro de aceitação na bancada

| Teste | Resultado esperado |
|---|---|
| Conferir circuito desligado | Nenhum curto, GND comum, 3V3 separado de 5 V, divisor no ECHO |
| Iniciar somente placa e servidor | Wi-Fi e comunicação sem reinícios |
| Conferir RC522 | Registrador responde; cada uma das seis tags tem UID diferente |
| Testar presença dez vezes | Caixa reconhecida e liberação após retirada, sem disparos com estação vazia |
| Cadastrar cada caixa | Uma tag por caixa e duplicatas rejeitadas |
| Entrada na A1 | Tag correta atualiza histórico e 3D; caixa é colocada fisicamente em A1 |
| Tag errada | Nenhuma posição muda; operador recebe aviso |
| Vaga ocupada | Operação recusada |
| Transferência e saída | Vaga anterior liberada e estado consistente |
| Operação acima de 60 s | Leitura expirada não move estoque |
| Tirar Wi-Fi e restaurar | Indicação offline; evento pendente reenviado sem duplicar |
| Reiniciar servidor | Posições preservadas, comando pendente cancelado |
| Reiniciar ESP32 durante envio | Uma leitura pendente recuperada; verificar resultado no histórico |
| Mover sem registrar | Correção manual com motivo resolve divergência |
| Iluminação da feira | Cores estáveis ou indefinidas, sem trocar identidade RFID |
| Apresentação de 15 min | Sem reinícios e com registros conferidos fisicamente |

Pare o simulador antes desses testes. Cada etapa que depende de hardware deve ser marcada pelo grupo somente depois de executada na montagem real.

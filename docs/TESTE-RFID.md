# Teste isolado do RFID

Usar quando o leitor responde, mas nenhum UID aparece no painel. Este programa
dispensa o ultrassônico e deixa o CS da tela desativado. Não usa rede, servidor
ou NVS; não cadastra nem escreve dados no chaveiro. A tela não é atualizada e
o painel mostra a placa offline durante o diagnóstico.

Manter a pinagem de `MONTAGEM.md`. Fechar a ponte USB e qualquer monitor serial
antes de gravar. No diretório `firmware`:

```powershell
python -m platformio run -e esp32dev-rfid-test -t upload --upload-port COM7
python -m platformio device monitor --port COM7 --baud 115200
```

A porta COM7 corresponde à bancada em 03/11/2026; conferir a porta atual.
Neste computador, as variáveis de caminhos no D: descritas em
`validacao-2026-11-03.md` também são necessárias para usar as ferramentas já instaladas.

Encostar o chaveiro na antena. Exemplo de leitura física obtida em 03/11:

```text
RFID_DIAG WUPA=0 ATQA=0400 UID=D61ED33E
```

`WUPA=0` significa resposta válida; `WUPA=3`, ausência de resposta no prazo.
O comando WUPA permite reler o mesmo chaveiro sem depender de afastamento.
O programa completo mantém sua regra de uma leitura por visita à estação.

A cada 15 segundos, o diagnóstico reinicializa o leitor ao terminar testes
de FIFO e CRC. FIFO testa escrita/leitura de bytes no chip. CRC compara o
resultado do chip com um cálculo local; não confundir isso com cadastro da tag.

## Resultado da bancada em 03/11

- SPI a 1 MHz, CS da tela desativado: UID `D61ED33E` lido repetidamente.
- Versão `0xB2`, FIFO com quatro bytes `55 AA 00 FF`: correto.
- Houve uma divergência no teste CRC: chip `EF6F`, esperado `7348`, status 0.
  Causa não determinada; não declarar todos os testes internos do chip aprovados.
- A leitura do UID foi bem-sucedida antes e depois desse teste interno.
- O firmware completo foi recompilado/gravado com SPI do RFID a 1 MHz.
  O teste isolado não determina sozinho se a dificuldade anterior vinha da
  velocidade, do compartilhamento com a tela, do posicionamento ou do estado da tag.

## Voltar ao sistema completo

Fechar o monitor e gravar o ambiente normal:

```powershell
python -m platformio run -e esp32dev -t upload --upload-port COM7
```

Na raiz do repositório, iniciar o servidor e, em outro terminal, a ponte:

```powershell
npm start
npm run usb -- --port COM7 --verbose
```

No programa completo, apresentar uma tag por vez ao RFID e afastá-la por pelo
menos dois segundos entre leituras. O ultrassônico não é utilizado.
Ler o UID não exige cadastro; o cadastro posterior associa esse UID à caixa.

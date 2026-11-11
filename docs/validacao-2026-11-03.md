# Teste da montagem no SENAI — 03/11/2026

## Calibração de cor concluída na bancada

Depois das correções descritas abaixo, as referências de branco e das três
cores foram coletadas e os ajustes foram aplicados. Ganhos R=0,873612603,
G=1, B=0,848191908; dominância mínima=1,10; amostragem filtrada de 15 pulsos.
As 52 amostras selecionadas passaram pela classificação do C++ original no PC.
Após gravar, o ESP32 físico reconheceu 7/7 novas leituras amarelas e 7/7 verdes.
O programa completo foi configurado com `COLOR_CALIBRATED true` para esta
iluminação/posição. Detalhes e limites da verificação em `TESTE-COR.md`.
As menções a cor desabilitada abaixo registram a etapa anterior à calibração.

## Atualização após os testes com o operador

Também foi criado `esp32dev-ultrasonic-test`, que compila somente
`ultrasonic-test.cpp`: TRIG 25, ECHO 26 com o divisor mantido, pulso de disparo
de 10 us, espera máxima de 40 ms e intervalo de 500 ms. Não atualiza painel/tela.
No teste físico após o relato de falta de eco, voltaram a aparecer pulsos:
a maioria em 995 us (17,1 cm), mas também 2,7, 4,6, 18,7 e 90,2 cm.
Não havia confirmação de alvo imóvel/medido com régua, portanto isso confirma
resposta do sensor, sem concluir precisão ou causa da intermitência.
Para executar, usar `python -m platformio run -e esp32dev-ultrasonic-test -t upload --upload-port COM7`
com a ponte fechada e observar a serial em 115200 baud; restaurar `esp32dev` ao terminar.

O chaveiro `D61ED33E` foi lido no diagnóstico isolado e depois pelo programa
completo, chegando ao servidor em duas leituras. Ainda não foi vinculado a uma
caixa: aguarda o operador informar a identificação correta. O estoque continua
vazio. O procedimento isolado está em `TESTE-RFID.md`.

Corrigida a apresentação dos sensores: ultrassônico indica **objeto próximo**,
nunca identidade de caixa; sem eco indica **sem leitura**. Classificação de cor
fica desabilitada (`COLOR_CALIBRATED false`) até validar a iluminação e a
posição atuais. O firmware ainda fornece pulsos brutos para diagnóstico;
o servidor não publica uma cor classificada sem confirmação de calibração e
presença. O teste exclusivo de cor continua disponível para calibrar.

Reconhecimento de tag sem vínculo é exibido como leitura realizada com cadastro
pendente. Registros antigos no histórico são preservados.

Após essas mudanças: 18 testes Node e 16 cenários de firmware no computador
aprovados, mais compilação/gravação física. As 12 verificações Python anteriores
continuam referentes à ponte não modificada. Isso não substitui os testes de
montagem vazia, iluminação e movimentação física ainda pendentes.

As observações seguintes registram a etapa inicial, anterior às leituras de tag.

## Resultado físico

ESP32-D0WD, revisão 1.0, conectada pela **COM7** (USB CH9102).
Firmware completo `esp32dev` compilado e gravado, com verificação do hash
pela ferramenta de gravação. Transporte USB, servidor local na porta 3000.
Sem `firmware/include/config.h` local: usados os parâmetros de `config.example.h`.

Antes da gravação, a placa executava o teste exclusivo de cor. O sensor produziu
pulsos não nulos nos três canais; isso confirma sinal, mas não a classificação
correta das caixas sob a iluminação atual.

Após a gravação final, seis consultas à API ao longo de aproximadamente 11 s
mostraram atualizações reais de `lastSeen` e:

| Item | Resultado | Limite da verificação |
|---|---|---|
| Placa → USB → servidor → placa | `deviceOnline: true`, `servidor=ok` | Conexão ativa durante o teste |
| Ultrassônico | 17,8 a 19,1 cm | Falta comparar com régua e testar aproximação/afastamento |
| RFID | `rfidOk: true`; registro de versão `0xB2` | Falta ler uma tag física |
| OLED | `oledOk: true` | Inicialização da biblioteca não prova imagem; conferir visualmente |
| Presença | `false` | Esperado com objeto distante; entrada exige distância menor que 4 cm |
| Cor no programa completo | `indefinida`, pulsos zerados | Esperado sem presença; medição é condicionada ao ultrassônico |

Nenhuma tag foi lida nesta etapa (`lastScan: null`). Estoque sem caixas
cadastradas, vagas vazias e histórico vazio. Não foram simuladas movimentações
no servidor da bancada.

## Correção do reconhecimento do RFID

O código rejeitava `0xB2` e, por isso, bloqueava `scanTag()`. Essa versão é
identificada como `FM17522_1` no código mantido pelo projeto
[Arduino_MFRC522v2](https://github.com/OSSLibraries/Arduino_MFRC522v2/blob/master/src/MFRC522Constants.h).

Incluído somente `0xB2` na lista de versões reconhecidas, mantendo a biblioteca
MFRC522 1.4.12 e a rejeição de respostas inválidas/desconhecidas. O teste
`reader-health` agora verifica também que essa versão permite criar um evento
de leitura com presença e cartão simulados. Essa simulação não comprova a
leitura por radiofrequência do módulo físico.

## Verificações de software executadas

- 17 testes Node: servidor, estoque e integração da ponte USB.
- 12 testes Python: protocolo e tratamento de falhas da ponte USB.
- 16 verificações do firmware no computador: 11 cenários C++, 3 integrações
  firmware/ponte/API, 1 cenário Wi-Fi e 1 cenário de teste exclusivo de cor.
- Total: **45 aprovadas**. Os 16 cenários do firmware foram executados após
  a correção de `0xB2`; os 29 testes de servidor/ponte foram executados antes
  dessa alteração, que não modifica esses componentes.
- Compilação e gravação da versão corrigida aprovadas; `git diff --check` sem erros.

## Retomar na bancada

O servidor e a ponte foram deixados ativos nesta sessão. Se precisar reiniciar,
na raiz do repositório, usar um terminal para cada comando:

```powershell
npm start
```

```powershell
npm run usb -- --port COM7 --verbose
```

Abrir `http://localhost:3000`. A chave do painel é `ADMIN_TOKEN` no `.env`
local, criado nesta sessão e ignorado pelo Git. Não publicar esse arquivo.
A porta COM pode mudar após reconectar a placa.

Para recompilar neste computador, as ferramentas foram localizadas/preparadas
no D:, pois o C: tinha aproximadamente 1 GB livre. Fechar a ponte antes de gravar:

```powershell
cd firmware
$env:PLATFORMIO_CORE_DIR='D:\PlatformIO-field'
$env:PLATFORMIO_BUILD_DIR='D:\PlatformIO-field-build'
$env:TEMP='D:\Codex-Senai\temp'
$env:TMP=$env:TEMP
python -m platformio run -e esp32dev -t upload --upload-port COM7
```

## Pendências que exigem alguém na maquete

1. Confirmar que a tela mostra o texto do estoque e a conexão USB.
2. Aproximar uma superfície plana a cerca de 3 cm do ultrassônico; verificar
   `present: true`. Afastar além de 6 cm; verificar `present: false`.
3. Com presença confirmada, aproximar uma tag da antena RFID e conferir o UID.
   Ultrassônico e RFID precisam observar a mesma caixa na estação de leitura.
4. Cadastrar as seis tags nas caixas correspondentes pelo painel.
5. Testar entrada e saída de uma caixa, incluindo o reflexo na maquete 3D.
6. Testar azul, verde e amarelo em posição e iluminação fixas; recalibrar o
   sensor de cor se necessário. A calibração atual foi feita em casa em 02/11.

Uma estação RFID não mede automaticamente a ocupação de cada vaga. A vaga
continua sendo escolhida pelo operador; a tag confirma a identidade da caixa.

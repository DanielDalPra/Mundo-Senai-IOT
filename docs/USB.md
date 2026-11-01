# Operar com o ESP32 conectado por USB

O firmware original agora oferece dois transportes para o mesmo protocolo de
estoque: USB ou HTTP pelo Wi-Fi. Em USB não é necessário configurar hotspot,
abrir firewall ou colocar o computador e a placa na mesma rede.

## Iniciar

1. Usar o firmware com `#define TRANSPORT_SERIAL 1` em `firmware/include/config.h`.
   O arquivo de exemplo também recomenda USB por padrão. Compilar e gravar
   normalmente com PlatformIO. Este modo não usa as credenciais de Wi-Fi.
2. Iniciar o servidor com `npm start`.
3. Em outro terminal da raiz, executar `npm run usb`. Com apenas uma porta USB
   serial, a ponte seleciona automaticamente a placa. Para selecionar:
   `npm run usb -- --port COM14`.
4. Abrir `http://localhost:3000` e usar normalmente Tags, Operar e Histórico.
   O `ADMIN_TOKEN` continua sendo a chave de login do painel no `.env`.

A ponte exige Python e pyserial (`python -m pip install pyserial`). Não abrir
outro monitor serial ao mesmo tempo: somente um programa pode usar a COM.
Antes de gravar um novo firmware, parar a ponte com Ctrl+C.

A ponte usa o `DEVICE_TOKEN` do `.env` somente no PC para autenticar na API;
não imprime a chave e não a transmite pela serial. O painel e a autenticação do
servidor permanecem os mesmos. Não iniciar o simulador fictício ao mesmo tempo
que a placa real usando o mesmo `DEVICE_ID`.

## O que passa pela USB

O ESP32 transmite linhas `APRENDE_REPORT` contendo um identificador da requisição
e a mesma telemetria/leitura que enviaria por HTTP. A ponte encaminha à API real
e devolve `APRENDE_REPLY` com o mesmo identificador. Não confirma eventos quando
ocorrem erros HTTP, JSON inválido ou respostas incompletas.

O firmware ignora respostas de outras requisições. Uma leitura pendente fica na
NVS até uma resposta válida; reenvios usam o mesmo `eventId`, e o servidor evita
movimentações duplicadas. Os comandos e prazos continuam vindos do servidor.

Para voltar ao Wi-Fi, definir `TRANSPORT_SERIAL 0`, configurar Wi-Fi, URL e token
da placa e gravar novamente. As credenciais locais ficam fora do Git.

## Validação de 01/11/2026

- Firmware compilado e gravado no ESP32-D0WD físico pela COM14.
- Ponte ativa e servidor real em `http://127.0.0.1:3000`.
- API confirmou `deviceOnline: true` e a serial mostrou `servidor=ok`.
- Os 17 testes passaram, incluindo a ponte Python conectada à API real com
  telemetria, cadastro, comando, entrada, reenvio deduplicado e saída.
- A placa real enviou `rfidOk: false`, `distanceCm: null`, `present: false`.
  Esses valores são falhas físicas/leituras ausentes, não dados simulados.
- `oledOk` confirma inicialização da biblioteca; não comprova imagem no display.

A comunicação real placa/servidor está validada. A leitura física de RFID e a
distância ainda precisam ser corrigidas na montagem. O usuário informou que
faltam dois cabos no RC522. Seguir a tabela de `MONTAGEM.md` com a alimentação
desligada; não misturar com a pinagem do documento original.

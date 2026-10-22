# Instalação, rede e primeira operação

## Servidor no computador

Use Node.js 24. Para baixar o projeto:

```sh
git clone https://github.com/DanielDalPra/Mundo-Senai-IOT.git
cd Mundo-Senai-IOT
npm run setup
npm start
```

Se baixar o ZIP pelo GitHub, extraia antes de abrir o terminal. Mantenha o terminal do servidor aberto durante o uso. Para encerrar, Ctrl+C.

`npm run setup` cria `.env` somente se não existir. Não sobrescreve configurações existentes. Campos:

| Campo | Uso |
|---|---|
| HOST | `0.0.0.0` aceita conexões da rede local |
| PORT | Porta do painel/API, padrão 3000 |
| ADMIN_TOKEN | Chave para entrar no navegador |
| DEVICE_TOKEN | Chave exclusiva que o ESP32 envia na API |
| DEVICE_ID | `esp32-maquete-01`, também configurado no firmware |
| DATA_DIR | Diretório do arquivo persistente, padrão `./data` |

O login usa um cookie HttpOnly/SameSite; a chave não é guardada no armazenamento local do navegador. A sessão dura até 12 horas ou até o servidor reiniciar. **Nunca use ADMIN_TOKEN no ESP32.**

## Rede Wi-Fi

1. Conecte computador e ESP32 a uma rede que permita comunicação entre clientes. O ESP32 clássico usa Wi-Fi **2,4 GHz**.
2. No Windows, execute `ipconfig` e encontre o IPv4 do adaptador que está na rede da placa. O comando `npm run setup` também lista endereços possíveis ao criar a configuração.
3. Abra `http://IP_DO_COMPUTADOR:3000` em outro aparelho da mesma rede. Se não abrir, resolva rede/firewall antes de testar o ESP32.
4. No aviso do Firewall do Windows, permita Node.js na rede privada confiável. Em ambiente escolar, solicite ao responsável a liberação da porta TCP 3000 entre os aparelhos, ou use uma rede de demonstração autorizada.
5. Redes convidadas podem impedir acesso entre clientes. Usar o mesmo nome de Wi-Fi não garante alcance. O computador pode estar na banda de 5 GHz se o roteador conectar as bandas à mesma LAN sem isolamento.
6. Se o IP mudar, atualize `SERVER_URL` e grave novamente. Uma reserva DHCP no roteador pode estabilizar esse endereço.

Não use `localhost` ou `127.0.0.1` no firmware: esses endereços apontariam para o próprio ESP32. GitHub hospeda os arquivos; GitHub Pages não executa este servidor Node.js. Esta entrega não implanta um servidor público.

## Configurar o firmware

Abra `firmware` no PlatformIO e copie:

```powershell
Copy-Item include/config.example.h include/config.h
```

Edite `config.h`:

```cpp
#define WIFI_SSID "nome-da-sua-rede"
#define WIFI_PASSWORD "senha-da-sua-rede"
#define SERVER_URL "http://192.168.1.100:3000"
#define DEVICE_TOKEN "mesmo-valor-de-DEVICE_TOKEN-no-arquivo-env"
#define DEVICE_ID "esp32-maquete-01"
```

Substitua os exemplos. Não acrescente `/api` nem barra final em `SERVER_URL`. O firmware adiciona `/api/device/report`.

O código compila com `config.example.h` quando `config.h` não existe, para permitir testes de compilação sem segredos. **Essa compilação não conecta à sua rede enquanto os exemplos não forem substituídos em config.h.**

Conecte o ESP32 por USB, selecione o ambiente `esp32dev` e faça Build/Upload. Se não detectar porta, confira cabo de dados e driver da ponte USB da placa. Se necessário, escolha `upload_port = COMx` no `platformio.ini`. Algumas DevKits exigem segurar BOOT no início do upload e soltar quando a gravação começar.

Abra o monitor serial em 115200. “RC522: 0x00” ou “0xFF” indica que a comunicação com o leitor precisa ser verificada. O firmware mantém Wi-Fi e servidor ativos mesmo que o OLED falhe na inicialização; essa inicialização confirma alocação/comandos da biblioteca, não a imagem física na tela.

## Primeira operação real

1. Confira os fios com tudo desligado, principalmente alimentação e divisor do ECHO.
2. Inicie o servidor. Grave a configuração na placa e ligue-a.
3. Aguarde “ESP32 conectado” no painel. Verifique distância e presença ao colocar/retirar uma caixa da estação.
4. Aba Tags: apresente a CX-01 com sua etiqueta interna próxima ao RC522. Clique em Usar última leitura e Vincular. Repita para as demais, sempre removendo a caixa entre leituras.
5. Na aba Operar, escolha CX-01, Entrada e A1. Prepare a operação e **espere ela aparecer no OLED**. A atualização de comandos ocorre aproximadamente a cada dois segundos.
6. Apresente a caixa. Aguarde confirmação no OLED/painel; verifique a caixa em A1 no 3D. Coloque fisicamente a caixa na vaga A1.
7. Para saída, retire a caixa da vaga, prepare Saída e passe pela estação. Para mudar de vaga, escolha Mudar de vaga e a nova vaga antes da leitura.

Se uma caixa já estava parada na estação antes da operação, retire-a por aproximadamente um segundo e reapresente. O firmware gera no máximo uma leitura por visita à estação.

## Uso diário e recuperação

- O estoque, cadastro e histórico ficam em `data/state.json`. O histórico guarda as 200 ocorrências mais recentes; os 1000 últimos IDs de leitura ficam disponíveis para impedir duplicações.
- Ao reiniciar o servidor, caixas e tags são preservadas, mas a operação pendente é cancelada.
- O ESP32 mantém uma leitura pendente na NVS até receber resposta válida. Não continua aceitando novas caixas enquanto houver uma leitura aguardando envio.
- Uma leitura antiga só pode aplicar a operação se ainda corresponder ao comando pendente e válido. Se expirou, prepare novamente e reapresente a caixa. Não há fila ilimitada de movimentos offline.
- Se a resposta se perder depois de o movimento ser salvo, o reenvio com o mesmo ID retorna o resultado anterior, sem duplicar a movimentação.
- Se a movimentação física já ocorreu sem registro, use Corrigir uma posição manualmente e explique o motivo.
- Para backup, pare o servidor e copie `data/state.json`. Para restaurar, pare o servidor e recoloque o arquivo. Se o JSON estiver danificado, o programa falha ao iniciar para não apagar silenciosamente o estoque.

## Segurança e operação local

As chaves de exemplo não são credenciais reais. `setup` gera chaves fortes por instalação. `.env`, `firmware/include/config.h`, `data/` e artefatos de compilação estão no `.gitignore`.

O transporte padrão é HTTP para a rede local da demonstração. Chaves podem ser observadas por alguém com acesso ao tráfego; não exponha essa configuração à internet. Para acesso remoto, será necessário planejar TLS, autenticação dos usuários e infraestrutura. Não abra portas do roteador para este protótipo.

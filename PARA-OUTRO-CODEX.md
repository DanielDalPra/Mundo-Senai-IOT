# Contexto para o Codex no notebook do SENAI

## Objetivo

Faça o aplicativo Estoque Inteligente funcionar no notebook do SENAI: servidor,
ponte USB, painel e modelo 3D. Ajude Daniel passo a passo em português, tomando
ações diretamente no computador quando possível. A montagem física ainda está
em andamento; não considere os sensores ou o display aprovados sem teste real.

Repositório original: https://github.com/DanielDalPra/Mundo-Senai-IOT

Também existe um repositório alternativo, feito para facilitar a execução no
notebook: https://github.com/DanielDalPra/Mundo-Senai-Pronto. Confira qual pasta
o usuário abriu antes de rodar comandos ou fazer alterações. No original, o
iniciador e as dependências podem ser diferentes dos do repositório alternativo.

## Situação importante da ESP32

Na última sessão, um teste isolado de OLED foi gravado. Na tentativa seguinte de
restaurar o firmware principal, o USB foi desconectado durante a gravação e ela
falhou. **A ESP pode estar sem firmware funcional ou com firmware incompleto.**
Não presuma que está com o programa principal nem que as tags e a tela estão
funcionando. Quando o usuário autorizar e a montagem estiver pronta, identifique
a porta e restaure o firmware principal deste projeto; confirme a gravação e
teste na placa física. O display isolado não foi visualmente confirmado.

O programa principal e a calibração estão em `firmware/src/main.cpp` e
`firmware/include/config.example.h`. O `config.h` local é ignorado pelo Git e
pode não existir no notebook novo. O transporte USB é o padrão do exemplo;
não exponha credenciais. A restauração do firmware requer ambiente PlatformIO,
mas a execução do servidor e da ponte não exige PlatformIO.

Na última montagem informada: ESP32 clássico, RC522, TCS3200 e OLED SPI.
O ultrassônico foi retirado do funcionamento por pedido do grupo. RFID e cor
devem operar independentemente; não use RFID como condição para exibir cor.
Os ganhos de cor do exemplo vieram de medições anteriores, mas o sinal já foi
intermitente; não prometa que estão calibrados para a montagem atual. Consulte
`docs/MONTAGEM.md`, `docs/CALIBRACAO.md` e os registros datados de validação.

## Aplicativo e comportamento solicitado

- ESP32 por USB → `scripts/usb-bridge.py` → servidor Node.js → painel/3D.
- Uma tag cadastrada identifica a caixa. A leitura de caixa fora do estoque
  programa sua entrada na primeira vaga virtual livre após cerca de 2 segundos.
  Uma nova leitura da caixa guardada registra sua saída. Não duplique movimentos
  por reenvio ou por uma tag que continua parada no leitor.
- O painel deve mostrar a caixa identificada e a cor medida, cada uma com sua
  fonte independente. O usuário pediu para não mostrar uma cor inventada enquanto
  a estação está vazia; sem sensor de presença, não há como determinar com
  segurança se o sensor vê a caixa ou o fundo. Não use a tag como condição para
  ler/exibir a cor sem conversar sobre essa limitação.
- O leitor é uma estação: ele não detecta a posição física em cada prateleira.
  A vaga escolhida automaticamente é virtual e precisa ser conferida fisicamente.
- Houve falhas intermitentes no RFID e no TCS3200. Reiniciar fez o RFID voltar
  uma vez, mas não comprovou uma solução definitiva.

## Caixas informadas pelo grupo

| Caixa | Cor | UID |
| --- | --- | --- |
| CX-01 | azul | D61ED33E |
| CX-02 | amarelo | 3608D13E |
| CX-03 | verde | 3B8FD33E |
| CX-04 | azul | 6D9BD33E |
| CX-05 | verde | 0B9ED33E |

O grupo tem cinco caixas. A CX-06 existe no modelo, mas não tem tag cadastrada.
O estoque/posições reais não devem ser inventados. Esses dados são de cadastro,
não são prova de que as caixas estão em alguma vaga. No repositório original,
`.env` e `data/` são ignorados e não vêm no ZIP. O repositório alternativo tem
`scripts/seed-tags.mjs`, que cadastra as cinco tags somente se não houver estado.

## Notebook do SENAI e bloqueios encontrados

- Em um notebook anterior, o grupo informou Node **22.13.0**, Python **3.13.1**
  e ESP na **COM25**. O notebook atual pode ser outro; verifique as versões e
  a porta de novo. Node 22 não foi validado integralmente; `package.json` do
  original especifica Node 24 ou superior.
- O computador do SENAI recusou o `INICIAR.ps1` do repositório alternativo por
  política de assinatura. Não desative políticas institucionais. Use comandos
  manuais permitidos ou prepare um iniciador que não exija esse script, conforme
  as regras locais. A instalação do Codex e a Assistência Rápida também foram
  bloqueadas em tentativas anteriores.
- No repositório alternativo, `vendor/serial` inclui pyserial. A ponte deve ser
  iniciada com essa pasta no `PYTHONPATH`. No original, verifique se pyserial
  já está instalado ou use a alternativa se existir. Nenhum monitor serial ou
  outra ponte pode manter a mesma COM aberta ao mesmo tempo.
- Para criar configuração no primeiro uso, `node scripts/setup.mjs` preserva
  `.env` existente; o servidor usa `node --env-file=.env server/index.mjs`.
  A ponte USB lê `DEVICE_TOKEN` do mesmo `.env`; o painel usa `ADMIN_TOKEN`.
  Não publique nem compartilhe tokens. Na serial, a autenticação HTTP é feita
  pela ponte; não é necessário gravar o token no ESP para o transporte USB.

## Validação desejada

1. Confira a pasta, alterações existentes, versões e porta COM; preserve dados.
2. Faça o servidor iniciar e verifique `/api/health`, depois autentique no painel.
3. Inicie a ponte USB e observe relatórios reais. Se a placa estiver com firmware
   incompleto, informe isso e restaure o principal quando a parte física estiver
   pronta. Não interprete `oled_init=ok` como confirmação visual do display.
4. Verifique as cinco tags, uma por vez; não cadastre nem altere uma associação
   sem evidência. Teste entrada e saída no painel/3D sem adivinhar vagas físicas.
5. Confira a leitura da cor separadamente. Faça testes de software apropriados e
   relate claramente o que foi observado na maquete e o que ainda falta testar.

O usuário prefere instruções curtas, uma etapa de cada vez, sem pedir para
recalibrar ou refazer fios repetidamente sem evidência. Nunca apresente resultado
simulado ou apenas compilado como teste físico bem-sucedido.

# Validacao na caixa de apresentacao — 10/11/2026

## Cor na tela independente do ultrassonico

O operador informou que a tela mostrava cor indefinida. No programa completo,
`readColor` so media com presenca ultrassonica e o servidor tambem escondia a
cor sem presenca. Isso impedia mostrar o sensor quando o ultrassonico estava
sem eco ou apontado para outra posicao.

O firmware agora le a cor continuamente, sem usar a presenca como condicao; a
entrada/saida do estoque continua exigindo a tag e o fluxo de operacao. A tela
exibe `Cor:` na primeira linha util e mostra `sem sinal` quando faltam pulsos.
O painel apresenta `Cor no sensor`, independente do ultrassonico; ele pode
estar vendo o fundo. A cor nao e prova de caixa na estacao nem altera o estoque.

Os testes nativos verificaram cor azul com presenca falsa, texto da tela,
ausencia de sinal e publicacao pelo firmware/ponte/API sem movimentar caixas.
O firmware foi compilado e gravado. A API real recebeu pulsos nao nulos e a
classificacao `vermelho` com presenca falsa; a cor real do alvo nao foi
confirmada nesse momento. O operador confirmou que o OLED fisico mostrou
`Cor: vermelho`, correspondente a telemetria. Isso confirma a exibicao, nao
a exatidao da cor do alvo. O ultrassonico relatou ausencia de eco na mesma
verificacao; sua situacao continua pendente de diagnostico.

## Estado ao voltar ao programa completo

O ambiente `esp32dev` foi compilado e gravado com os ganhos de 10/11;
`COLOR_CALIBRATED` esta habilitado e a ponte USB foi retomada. A API confirmou
ESP32 online, RFID respondendo ao registrador e estacao sem presenca, com
distancias em torno de 11,2–11,4 cm e algumas leituras invalidas. Naquela
versao, a cor era condicionada a presenca; isso foi alterado na secao acima.

Os ganhos foram calculados e classificados corretamente nas amostras obtidas,
mas o sinal de cor teve falhas na verificacao fisica do verde, descritas abaixo.
A recuperacao automatica da escala nao restabeleceu o sinal durante a ultima
sequencia de 14 leituras sem sinal; nao se deve declarar o sensor confiavel.

## Ultrassonico

ESP32-D0WD na COM7, servidor na porta 3000 e ponte USB. Na caixa de apresentacao, o operador confirmou a estacao vazia e depois uma caixa a cerca de 3 cm. Antes do filtro, a estacao vazia deu 12 amostras, com leituras validas de 11,6 a 12,2 cm e um pico capturado de 0,5 cm; houve presenca em 5/12. Com caixa, 10 amostras mostraram presenca, com leituras validas de 3,1 a 5,1 cm e quatro leituras abaixo de 2 cm.

A configuracao foi ajustada para entrada abaixo de 6 cm e liberacao acima de 9 cm. O firmware rejeita leituras fora de 2–400 cm, usa a mediana das ultimas cinco validas, exige pelo menos tres para iniciar e aplica histerese. Perda de sinal por ate 2 segundos mantem temporariamente o ultimo estado; depois limpa presenca e historico. Distancia indisponivel permanece null. Os testes nativos de presenca, RFID, servidor e recuperacao passaram.

Uma versao intermediaria liberava apos tres leituras invalidas; com caixa houve presenca em 6/7 verificacoes. A versao final recebeu tolerancia de 2 segundos e, com estacao vazia confirmada, mostrou 7/7 sem presenca, embora duas distancias tenham ficado indisponiveis. A presenca com caixa ainda necessita ser repetida apos o ajuste final. As amostras e a posicao confirmada em cada fase estao em `docs/calibracao/ultrassom-*-2026-11-10-*.json`. A coleta sem reconfirmacao apos gravar esta identificada no proprio JSON.

## Cor e historico de diagnostico

O operador confirmou quatro LEDs acesos e papel branco a 1–2 cm. Inicialmente, 7/7 leituras no teste isolado ficaram R=G=B=0. O operador conferiu OUT–GPIO34; apos reconectar, os pulsos voltaram. Isso nao identifica sozinho a causa da interrupcao. A referencia branca posterior teve 13 amostras estaveis, medianas R=225, G=215 e B=169 us, e ganhos normalizados R=1, G=0,955555556 e B=0,751111111.

As faces azul e verde tiveram 13/13 amostras validas classificadas pela regra proposta. A face amarela teve 13/13 amostras validas, com uma leitura adicional sem sinal. As 52 leituras selecionadas de branco e das tres cores foram repetidas no codigo C++ original e passaram. Com os ganhos novos gravados no teste exclusivo, foram observadas 7/7 novas leituras amarelas. Os registros completos e as perdas estao nos arquivos `docs/calibracao/tcs3200-*2026-11-10*.json`.

Na verificacao fisica seguinte do verde, 2/7 leituras foram verde e 5/7 sem
sinal. Numa observacao adicional, 14/14 ficaram sem sinal, apesar das
solicitacoes automaticas de retomada da escala. O diagnostico anterior tambem
havia observado GPIO34 baixo em todas as escalas. Portanto, a regra calculada
para as cores nao resolve a intermitencia do sinal de entrada; sua causa nao
foi identificada e a leitura de cor continua sem confiabilidade comprovada.

A leitura de cor agora tolera ate tres pulsos ausentes em 15 por canal e mantem indefinida com menos de 12 validos. Depois de duas leituras sem sinal, solicita retomada da escala S0/S1. Esse mecanismo nao identifica nem corrige necessariamente a causa de uma interrupcao eletrica.

O diagnostico `esp32dev-color-signal-test` testou 20%, 100% e 2% nos tres filtros: o GPIO34 ficou baixo e sem transicoes observadas. A troca do jumper nunca foi confirmada explicitamente. Outra coleta pedida pelo operador retornou o mesmo; os logs `tcs3200-sinal-*.json` preservam os resultados. Foi sugerido testar GPIO34 no 3V3 com o OUT do sensor desconectado; o operador recusou e nao e necessario repetir a sugestao. Em seguida, a pedido dele, o programa completo e a calibracao anterior foram restaurados sem mudancas fisicas solicitadas, com API online, RFID respondendo e distancia em torno de 11,2 cm sem presenca. Depois o operador pediu para retomar a calibracao, as tres cores foram coletadas e os novos ganhos aplicados no modo de teste.

## Limites da verificacao

O RFID respondeu ao registrador; o UID D61ED33E foi lido em 03/11 e ainda precisa ser vinculado a caixa escolhida. Inicializacao OLED nao confirma imagem visivel. A regra de cor foi ajustada com amostras desta iluminacao e geometria e deve ser revalidada se elas mudarem. O teste exclusivo nao atualiza servidor ou estoque; o programa completo foi gravado novamente depois dos testes. Testes nativos executam o codigo real com pinos simulados e nao substituem teste fisico.

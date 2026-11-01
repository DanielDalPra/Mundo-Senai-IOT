# Testes nativos do firmware

`npm run test:firmware` compila e executa o arquivo original
`firmware/src/main.cpp`, incluído por `main.cpp`.

As implementações em `stubs/` substituem somente as APIs de hardware/rede que
não existem no PC. Não validam eletrônica, SPI, temporização do ESP32 ou flash.
As entradas de distância são convertidas em duração de pulso e entregues a
`pulseIn`; as funções originais fazem histerese e classificação de cores.

`integration.test.mjs` executa o firmware, a ponte Python e o servidor Node em
processos reais. Os dados são temporários e as chaves são exclusivas dos testes.

Detalhes: [validação do firmware](../../docs/VALIDACAO-FIRMWARE.md).

"""Gera o manual resumido em PDF. Requer reportlab (somente para documentação)."""
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image,Preformatted
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.lib.enums import TA_LEFT
from reportlab.graphics.shapes import Drawing,Rect,String,Line,Circle
from reportlab.lib.pagesizes import A4
root=Path(__file__).resolve().parents[1]
navy=HexColor('#19385e');blue=HexColor('#255cb6');muted=HexColor('#62758c');pale=HexColor('#edf3fb');yellow=HexColor('#f4d751')
W,H=A4;margin=43;content=W-margin*2
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=29,leading=33,textColor=navy,spaceAfter=16),
 'h1':ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=21,leading=26,textColor=navy,spaceAfter=18),
 'h2':ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=12,leading=16,textColor=blue,spaceBefore=14,spaceAfter=7),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=15,textColor=navy,spaceAfter=10),
 'small':ParagraphStyle('small',fontName='Helvetica',fontSize=8.5,leading=12,textColor=muted,spaceAfter=8),
 'table':ParagraphStyle('table',fontName='Helvetica',fontSize=8.8,leading=12,textColor=navy),
 'code':ParagraphStyle('code',fontName='Courier',fontSize=8,leading=12,textColor=navy,backColor=pale,borderPadding=10,spaceBefore=8,spaceAfter=12)
}
story=[]
def p(text,kind='body'):story.append(Paragraph(text,styles[kind]))
def h(text):p(text,'h2')
def page(num,title):
 if story:story.append(PageBreak())
 p(f'MUNDO SENAI / GUIA {num:02d}','small');p(title,'h1')
def table(rows,widths,small=False):
 data=[[Paragraph(str(v),styles['table']) for v in row] for row in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),pale),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5 if small else 8),('BOTTOMPADDING',(0,0),(-1,-1),5 if small else 8),('LINEBELOW',(0,0),(-1,0),1,HexColor('#cfdbeb')),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f8fafc')])]))
 story.append(t);story.append(Spacer(1,10))
def code(text):story.append(Preformatted(text,styles['code']))
def step(n,title,body):p(f'<b>{n}. {title}</b><br/>{body}')
def footer(c,doc):
 c.setFillColor(muted);c.setFont('Helvetica',8);c.drawString(margin,25,'Estoque Inteligente | Montagem e operação | v1.0');c.drawRightString(W-margin,25,str(doc.page));c.setStrokeColor(HexColor('#dce5f0'));c.line(margin,39,W-margin,39)

p('MUNDO SENAI / ESP32 + RFID','small');p('Estoque<br/>Inteligente','title');p('Manual de montagem e operação','h2')
p('Uma estação de leitura para identificar as seis caixas e manter o estoque registrado no modelo 3D. Projeto baseado nas fotos e na documentação fornecidas pelo grupo.')
img=Image(str(root/'assets/previa.png'),width=content,height=content*874/1110);img.hAlign='LEFT';story.append(img)
h('Antes de começar')
p('O sistema utiliza um ESP32 clássico WROOM/DevKit. As tags ficam dentro das caixas. O operador escolhe a vaga e confirma a operação aproximando a caixa da estação.')
p('<b>Limite importante:</b> um leitor RFID e um ultrassônico não localizam automaticamente seis caixas nas prateleiras. O 3D mostra os registros feitos pelo fluxo, não uma medição independente de cada vaga.','small')
p('Código e documentação completa: <link href="https://github.com/DanielDalPra/Mundo-Senai-IOT" color="#255cb6">github.com/DanielDalPra/Mundo-Senai-IOT</link>','small')

page(2,'Peças e estação física')
table([['Componente','Uso'],['ESP32 WROOM/DevKit','Wi-Fi, sensores, leitor e display. A variante deve expor os GPIOs da tabela.'],['RC522 + seis tags distintas','Identificação da caixa por UID. Tags compatíveis de 13,56 MHz.'],['HC-SR04','Presença da caixa na estação de leitura.'],['TCS3200 / Color Sensor V443','Cor complementar; não identifica a caixa.'],['OLED SPI de seis pinos','Mensagens de operação e conexão. SSD1306 128×64 assumido conforme o DOCX.'],['Protoboard, jumpers e USB de dados','Montagem temporária, gravação e alimentação.'],['Resistores 2,2 kOhm + 3,3 kOhm','Divisor do ECHO. Preferir 1%; não identificados nas fotos.']],[173,content-173])
h('Reposicione para ler a mesma caixa')
p('Os sensores aparecem em lados diferentes nas fotos. Monte uma estação à frente do depósito: o RFID fica perto da etiqueta, o ultrassônico aponta para a face da mesma caixa e o sensor de cor observa uma área colorida uniforme.')
step(1,'RFID junto à etiqueta','Fixe o RC522 sob papelão fino ou ao lado da caixa. Oriente a tag interna paralela à antena e teste o alcance real. Evite metal e duas tags próximas ao mesmo tempo.')
step(2,'Batente para o ultrassônico','Comece posicionando a face da caixa a cerca de 3 cm. O limite de entrada é 4 cm e o de liberação é 6 cm; esses valores precisam ser testados.')
step(3,'Cor com luz estável','Comece a aproximadamente 1-2 cm de uma área colorida, ajuste conforme o módulo e proteja de variações de luz. Mantenha o OLED visível.')
step(4,'Marque as prateleiras','A1, A2, A3 na superior; B1, B2, B3 na inferior, da esquerda para a direita quando vistas de frente.')

page(3,'Pinagem revisada')
p('Números da tabela são GPIO. Use os rótulos impressos, não a posição dos pinos. <b>Não misture esta pinagem com a tabela do documento antigo.</b>','small')
rows=[['Módulo','Terminal','Destino / ligação'],['OLED','VCC / GND','3V3 / GND'],['OLED','CLK (D0)','GPIO18, compartilhado'],['OLED','MOSI (D1)','GPIO23, compartilhado'],['OLED','CS / D/C','GPIO16 / GPIO27'],['OLED','RESET','Sem terminal na foto; configuração -1'],['RC522','3.3V / GND','3V3 / GND'],['RC522','SCK / MOSI / MISO','GPIO18 / GPIO23 / GPIO19'],['RC522','SDA (SS) / RST','GPIO21 / GPIO22'],['RC522','IRQ','Sem conexão'],['HC-SR04','VCC / GND','5 V / GND'],['HC-SR04','TRIG','GPIO25'],['HC-SR04','ECHO','Divisor 2,2 kOhm + 3,3 kOhm, depois GPIO26'],['TCS3200','VCC / GND','3V3 / GND'],['TCS3200','S0 / S1','GPIO32 / GPIO33'],['TCS3200','S2 / S3','GPIO13 / GPIO14'],['TCS3200','OUT','GPIO34, somente entrada'],['TCS3200','LED','3V3; confirme a habilitação na bancada']]
table(rows,[82,137,content-219],True)
h('Notas de ligação')
p('O OLED e o RC522 compartilham CLK e MOSI, mas possuem CS separados. SDA/SS do RC522 é seleção SPI neste projeto; não é I²C. Use fios curtos nos primeiros testes.')
p('O módulo de cor fotografado repete VCC/GND nos cabeçalhos. Use a mesma alimentação de 3,3 V. Ele expõe LED, não OE. O GPIO34 não possui saída; está reservado a OUT.')
p('A placa OLED mostra seis terminais: VCC, GND, CLK, MOSI, CS e D/C. Se o módulo real usar outro controlador ou tiver RESET exposto, revise a configuração antes de energizar.','small')

page(4,'Alimentação e montagem segura')
p('<b>Desconecte o USB antes de mexer nos fios.</b> Todos os módulos devem compartilhar GND.')
table([['Alimentação','Ligação'],['3V3','RC522, OLED e TCS3200. Nunca 5 V no RC522 ou nos GPIOs.'],['5 V','Somente HC-SR04 neste circuito. Use a linha USB/VIN se a DevKit confirmar 5 V nesse pino; caso contrário, fonte regulada com GND comum.'],['ESP32','Alimentado por USB. Evite ligar fontes em paralelo sem conhecer o circuito da placa.']],[95,content-95])
h('Divisor do ECHO: obrigatório')
d=Drawing(content,155)
d.add(Rect(0,0,content,150,fillColor=pale,strokeColor=None));d.add(String(20,122,'ECHO (5 V)  ->  divisor  ->  GPIO26 (~3,0 V)',fontName='Helvetica-Bold',fontSize=12,fillColor=navy))
d.add(Line(25,80,100,80,strokeColor=blue,strokeWidth=2));d.add(Rect(100,69,85,22,fillColor=yellow,strokeColor=navy));d.add(String(105,100,'R1: 2,2 kOhm',fontSize=9));d.add(Line(185,80,355,80,strokeColor=blue,strokeWidth=2));d.add(Circle(260,80,3,fillColor=blue));d.add(String(365,77,'GPIO26',fontSize=11));d.add(Line(260,80,260,36,strokeColor=blue,strokeWidth=2));d.add(Rect(260,26,85,20,fillColor=yellow,strokeColor=navy));d.add(String(266,52,'R2: 3,3 kOhm',fontSize=9));d.add(Line(345,36,355,36,strokeColor=blue,strokeWidth=2));d.add(String(365,33,'GND',fontSize=11));story.append(d)
p('A junção R1/R2 vai ao GPIO26. R1 fica entre ECHO e a junção; R2 entre a junção e GND. Tensão nominal: 5 × 3,3 / (2,2 + 3,3) = 3,0 V. Não ligue o ECHO diretamente ao ESP32.','small')
step(1,'Confira os trilhos','Verifique continuidade da protoboard, GND comum e separação entre 3V3 e 5 V. Não conecte 5 V no trilho de 3V3.')
step(2,'Monte por etapas','Comece com ESP32 e RFID; adicione OLED, depois ultrassônico com divisor, depois o sensor de cor. Confira a tabela antes de cada energização.')
step(3,'Teste os LEDs do sensor de cor','O projeto alimenta o TCS3200 em 3,3 V. Se os LEDs ficarem fracos, use luz externa estável e calibre. Mudar para 5 V exige adaptação dos sinais lógicos.')
step(4,'Fixe após testar','Só fixe sensores e organize os fios quando Wi-Fi, leitura das tags e presença estiverem confiáveis na posição final.')

page(5,'Servidor e gravação do ESP32')
h('No computador: Node.js 24')
code('git clone https://github.com/DanielDalPra/Mundo-Senai-IOT.git\ncd Mundo-Senai-IOT\nnpm run setup\nnpm start')
p('Abra <b>http://localhost:3000</b>. O comando setup cria o arquivo .env com chaves aleatórias. Use ADMIN_TOKEN para entrar no painel. DEVICE_TOKEN é a chave que será copiada para o ESP32.')
h('Rede local')
p('Mantenha o computador e a placa numa rede com comunicação entre clientes. O ESP32 clássico usa Wi-Fi de 2,4 GHz. No Windows, execute ipconfig e encontre o IPv4 da rede correta. Teste o painel em outro aparelho usando esse IP.')
p('Permita Node.js/porta TCP 3000 no firewall da rede privada autorizada. Redes convidadas podem bloquear comunicação. Não abra a porta no roteador para a internet.','small')
h('Firmware: PlatformIO no VS Code')
step(1,'Abra a pasta firmware','Instale a extensão PlatformIO IDE. O ambiente esp32dev e as bibliotecas estão definidos em platformio.ini.')
step(2,'Crie a configuração local','Copie include/config.example.h para include/config.h. Preencha os campos abaixo.')
code('#define WIFI_SSID "nome-da-rede"\n#define WIFI_PASSWORD "senha-da-rede"\n#define SERVER_URL "http://192.168.1.100:3000"\n#define DEVICE_TOKEN "valor-do-DEVICE_TOKEN-no-env"\n#define DEVICE_ID "esp32-maquete-01"')
p('Troque os exemplos pelos seus valores. SERVER_URL não usa localhost, nem /api, nem barra final. Nunca use ADMIN_TOKEN no firmware. Os arquivos .env e config.h são ignorados pelo Git.','small')
step(3,'Compile, grave e monitore','Clique em Build e Upload. Use cabo USB de dados. Abra o monitor serial a 115200 baud. Se necessário, confira a porta COM e segure BOOT no início da gravação.')
p('A compilação sem config.h usa exemplos para permitir validação do código; não conectará à sua rede até a configuração real ser preenchida.','small')

page(6,'Cadastro e operação das caixas')
h('Cadastre as seis tags')
step(1,'Verifique a conexão','Inicie o servidor e ligue a placa. O painel deve mostrar ESP32 conectado. Confirme presença e distância colocando uma caixa na estação.')
step(2,'Leia e vincule','Na aba Tags, apresente uma caixa, use a última leitura e vincule o UID à CX correspondente. Não use o UID de exemplo como se fosse uma tag real.')
step(3,'Retire entre leituras','Retire a caixa por cerca de um segundo para liberar a estação. Repita com as seis caixas. Cada tag só pode pertencer a uma caixa.')
h('Faça um movimento')
table([['Ação','Sequência'],['Entrada','Selecione caixa fora do estoque + vaga livre. Prepare a leitura.'],['Saída','Retire a caixa da vaga e selecione saída para essa caixa.'],['Mudar de vaga','Selecione caixa já registrada e uma nova vaga livre.']],[100,content-100])
p('Após preparar, <b>espere a operação aparecer no OLED</b> e então aproxime a caixa. A leitura da tag esperada confirma o registro. O prazo é 60 segundos. Depois da entrada ou mudança, posicione fisicamente a caixa na vaga escolhida.')
h('O que o 3D representa')
p('O modo conectado inicia sem ocupação presumida, mesmo que as fotos mostrem caixas na estante. O servidor é a fonte das posições. A demonstração manual é separada e não altera esse estoque.')
h('Se a conexão cair')
p('O ESP32 conserva uma leitura pendente e a reenvia com o mesmo ID. Se o servidor já salvou o movimento, ele não repete a operação. Uma leitura com comando expirado é recusada; prepare novamente e reapresente a caixa.')
p('Sem comunicação, não continue movimentando várias caixas esperando uma fila automática: há apenas uma leitura pendente. Se alguém mover uma caixa fora do fluxo, use a correção manual com motivo e confira a maquete.')
h('Preserve os registros')
p('O servidor guarda estado e histórico em data/state.json. Para backup, pare o servidor e copie esse arquivo. Reiniciar preserva as caixas, mas cancela a operação pendente.')

page(7,'Calibração e diagnóstico')
h('Presença')
p('Entrada: duas leituras abaixo de 4 cm. Liberação: três leituras acima de 6 cm ou sem eco. Ajuste PRESENCE_ENTER_CM e PRESENCE_EXIT_CM no config.h após testar o batente. Um timeout é enviado como distância nula, nunca como zero.')
h('Cor')
p('pulseIn mede duração em microssegundos. O firmware usa ganho/pulso, e trata zero como falha. Para calibrar, coloque um cartão branco na posição final, anote a mediana de dez leituras R/G/B e use essas durações em COLOR_GAIN_R, COLOR_GAIN_G e COLOR_GAIN_B. Grave novamente e teste as caixas.')
p('A cor é complementar: várias caixas têm a mesma cor. UID é a identidade. Se a iluminação não estiver estável, aceite indefinida ou desative COLOR_ENABLED até ajustar o módulo.','small')
table([['Sintoma','O que conferir'],['RC522 0x00 / 0xFF','3V3, GND, CS21, RST22, MISO19, MOSI23 e SCK18.'],['Tag não aparece','Presença na estação, alcance da etiqueta interna, orientação, metal e compatibilidade da tag.'],['Só lê uma vez','Retire a caixa por cerca de um segundo e reapresente.'],['OLED apagado','SPI de seis pinos, alimentação, CS16, DC27 e controlador/resolução reais.'],['Sem eco','5 V no HC-SR04, divisor correto, alvo plano e GND comum.'],['Wi-Fi sem servidor','IP/porta, firewall, isolamento de clientes e SERVER_URL.'],['HTTP 401 / 403','DEVICE_TOKEN e DEVICE_ID iguais aos valores do servidor.'],['Cor indefinida','OUT34, S0/S1, filtros, pulsos zero, distância e luz.'],['3D difere da maquete','Movimento sem leitura: corrigir posição com motivo.']],[135,content-135],True)
p('Teste pelo menos dez inserções/retiradas por caixa, incluindo leitura da tag errada e tentativa de vaga ocupada. Faça isso na montagem final e na iluminação da apresentação.','small')

page(8,'Validação e referências')
h('Validação de software')
p('A suíte npm test verifica cadastro e UID único, entrada, saída e mudança de vaga, conflitos, prazo, cancelamento, leitura errada, repetição de evento, persistência, autenticação, SSE e proteção de rotas. O teste de navegador também verifica login, cadastro, confirmação RFID simulada, sincronização do 3D e layout móvel.')
p('O registro atualizado da compilação e dos testes está em <b>docs/TESTES.md</b>. Testes simulados validam o software, não o circuito físico. Não foi conectado nem gravado o ESP32 do grupo nesta entrega.')
h('Teste sem placa')
code('npm test\nnpm run simulate -- --watch\n# Em outro terminal, exemplo de leitura:\nnpm run simulate -- --uid 04A1B201')
p('Cadastre o UID fictício e prepare uma operação antes de repetir a leitura. Pare o simulador antes de usar o ESP32 real. Os dados simulados usam a mesma API e devem ser reconciliados antes da apresentação.','small')
h('Documentação completa no repositório')
p('<b>docs/MONTAGEM.md</b>: pinagem, componentes e alimentação.<br/><b>docs/INSTALACAO.md</b>: servidor, Wi-Fi, upload e recuperação.<br/><b>docs/CALIBRACAO.md</b>: sensores e diagnóstico.<br/><b>docs/ARQUITETURA-API.md</b>: endpoints, protocolo e modelo.<br/><b>docs/TESTES.md</b>: evidências e roteiro de bancada.')
h('Fontes técnicas')
for title,url in [('Espressif: ESP32, GPIO e limites elétricos','https://documentation.espressif.com/esp32_datasheet_en.html'),('NXP: MFRC522','https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf'),('Adafruit: HC-SR04 e ECHO de 5 V','https://learn.adafruit.com/ultrasonic-sonar-distance-sensors/pinouts'),('ams OSRAM: TCS3200','https://ams-osram.com/products/sensor-solutions/ambient-light-color-spectral-proximity-sensors/ams-tcs3200-color-sensor'),('Adafruit: biblioteca SSD1306','https://github.com/adafruit/Adafruit_SSD1306')]:p(f'<link href="{url}" color="#255cb6">{title}</link>','small')
p('Os anexos do grupo foram tratados como referência técnica. O DOCX original, as fotos e o vídeo estão preservados em referencias/. A pinagem foi revisada; as instruções deste manual correspondem ao firmware do repositório.','small')
doc=SimpleDocTemplate(str(root/'docs/Manual-de-montagem.pdf'),pagesize=A4,rightMargin=margin,leftMargin=margin,topMargin=39,bottomMargin=54,title='Estoque Inteligente - Manual de montagem e operação',author='Projeto Mundo SENAI')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(root/'docs/Manual-de-montagem.pdf')

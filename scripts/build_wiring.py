"""Gera o mapa lógico de montagem, sem representar a posição física dos GPIOs."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'montagem-fiel.svg'
parts = []
def add(s): parts.append(s)
def rect(x,y,w,h,fill,stroke='none',r=0):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
def text(x,y,s,size=22,fill='#18313c',weight=400,anchor='start'):
    add(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{escape(s)}</text>')
def line(points,color='#397a9b',width=3):
    add(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')
def dot(x,y,color): add(f'<circle cx="{x}" cy="{y}" r="5" fill="{color}"/>')

add('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1580" viewBox="0 0 1920 1580">')
add('<style>text{font-family:Arial,sans-serif} .mono{font-family:Consolas,monospace}</style>')
rect(0,0,1920,1580,'#f3f2eb')
rect(0,0,1920,16,'#176c61')
text(60,75,'MUNDO SENAI  /  ESTOQUE INTELIGENTE',21,'#176c61',700)
text(60,139,'Monte por pino. Confira por módulo.',48,'#18313c',700)
text(60,182,'ESP32 DevKit clássico • Pinagem do firmware deste repositório • USB desligado durante a montagem',24)
text(60,219,'Mapa lógico: os terminais repetidos são o mesmo GPIO. A posição física muda entre versões da DevKit.',21,'#536c76')

# Central controller: repeated logical net terminals avoid presenting a guessed physical pinout.
rect(650,260,620,810,'#203e48',r=22)
text(960,309,'ESP32',40,'#ffffff',700,'middle')
text(960,341,'WROOM / DevKit clássico',22,'#c0d7d7',400,'middle')
rect(865,385,190,254,'#cbd0c6',r=10)
rect(880,400,160,62,'#a5ada8',r=6)
for i in range(6): line(f'{894+i*23},411 {894+i*23},451','#6f7c75',5)
text(960,518,'ESP32',25,'#324e54',700,'middle')
text(960,550,'Wi-Fi + USB',18,'#324e54',400,'middle')
text(960,588,'3,3 V nos GPIOs',18,'#324e54',700,'middle')
rect(909,963,102,69,'#b8c2bf',r=7)
rect(926,981,68,31,'#314c54',r=4)
text(960,1052,'USB → computador',18,'#dbe8e5',400,'middle')
text(960,711,'GPIO18 + GPIO23',20,'#ffffff',700,'middle')
text(960,741,'compartilhados no SPI',18,'#c0d7d7',400,'middle')
text(960,801,'3V3 e GND',20,'#ffffff',700,'middle')
text(960,831,'podem usar os barramentos',17,'#c0d7d7',400,'middle')
text(960,858,'da protoboard',17,'#c0d7d7',400,'middle')

def module(x,y,w,h,title,subtitle,rows,side,accent):
    rect(x,y,w,h,'#ffffff','#d7dfd9',16)
    rect(x,y,8,h,accent,r=3)
    text(x+25,y+41,title,27,weight=700)
    text(x+25,y+73,subtitle,18,'#536c76')
    for i,(label,net,kind) in enumerate(rows):
        yy=y+111+i*36
        color={'power':'#c54c36','ground':'#43535a','spi':'#287b98','signal':'#6e58a0','echo':'#b16c19','none':'#98a5a7'}[kind]
        if side=='left':
            text(x+25,yy+7,label,20)
            p=x+w; q=650
            line(f'{p},{yy} {q},{yy}',color)
            dot(p,yy,color);dot(q,yy,color)
            text(q+16,yy+7,net,18,'#ffffff',700)
        else:
            text(x+w-25,yy+7,label,20,anchor='end')
            p=x; q=1270
            line(f'{q},{yy} {p},{yy}',color)
            dot(p,yy,color);dot(q,yy,color)
            text(q-16,yy+7,net,18,'#ffffff',700,'end')

module(60,260,430,404,'01  RC522 · RFID','Alimentação 3,3 V • SPI',[
 ('3.3V','3V3','power'),('GND','GND','ground'),('SDA / SS','GPIO21','signal'),
 ('SCK','GPIO18','spi'),('MOSI','GPIO23','spi'),('MISO','GPIO19','spi'),('RST','GPIO22','signal')
],'left','#287b98')
text(85,646,'IRQ: deixe sem conexão.',18,'#536c76')
module(60,700,430,370,'02  OLED SPI · 6 pinos','Não usar pinagem de display I²C',[
 ('VCC','3V3','power'),('GND','GND','ground'),('CLK / D0','GPIO18','spi'),
 ('MOSI / D1','GPIO23','spi'),('CS','GPIO16','signal'),('D/C / DC','GPIO27','signal')
],'left','#287b98')
text(85,1046,'Sem RESET exposto: firmware usa −1.',18,'#536c76')
module(1430,260,430,440,'03  TCS3200 · Cor','Módulo com terminal LED',[
 ('VCC','3V3','power'),('GND','GND','ground'),('S0','GPIO32','signal'),('S1','GPIO33','signal'),
 ('S2','GPIO13','signal'),('S3','GPIO14','signal'),('OUT','GPIO34','signal'),('LED*','3V3','power')
],'right','#6e58a0')
text(1455,679,'* Confirmar função LED no módulo real.',17,'#536c76')
module(1430,750,430,320,'04  HC-SR04 · Presença','Sensor ultrassônico de quatro pinos',[
 ('VCC','5 V USB / VIN*','power'),('GND','GND','ground'),('TRIG','GPIO25','signal'),
 ('ECHO → divisor abaixo','GPIO26 via divisor','echo')
],'right','#b16c19')
text(1455,1046,'* Confirmar 5 V da DevKit com USB.',17,'#536c76')

rect(60,1100,1800,245,'#fff7e6','#e7c98e',16)
text(85,1141,'DIVISOR DO ECHO  /  NÃO LIGAR ECHO DIRETO AO ESP32',25,'#805014',700)
text(85,1174,'A saída do HC-SR04 é de 5 V. Os dois resistores abaixo reduzem o sinal para aproximadamente 3,0 V.',21,'#805014')
text(85,1248,'ECHO',23,weight=700)
line('175,1240 285,1240','#b16c19',4)
rect(285,1223,160,34,'#ffffff','#b16c19',3)
text(365,1210,'R1 · 2,2 kΩ',21,anchor='middle')
line('445,1240 680,1240 1020,1240','#b16c19',4);dot(680,1240,'#b16c19')
text(1040,1248,'GPIO26',23,weight=700)
line('680,1240 680,1300 790,1300','#b16c19',4)
rect(790,1283,160,34,'#ffffff','#b16c19',3)
text(870,1273,'R2 · 3,3 kΩ',21,anchor='middle')
line('950,1300 1020,1300','#43535a',4);text(1040,1308,'GND',23,weight=700)
text(1260,1244,'A junção dos resistores vai ao GPIO26.',21,'#805014')
text(1260,1280,'5 × 3,3 / (2,2 + 3,3) ≈ 3,0 V',21,'#805014')

text(60,1394,'ANTES DE LIGAR',22,'#176c61',700)
text(60,1433,'1  USB fora enquanto liga os fios.',21)
text(60,1470,'2  GND comum a todos os módulos.',21)
text(680,1433,'3  RC522, OLED e cor em 3V3.',21)
text(680,1470,'4  Siga os nomes dos pinos da placa.',21)
text(1300,1433,'5  HC-SR04 com divisor no ECHO.',21)
text(1300,1470,'6  SPI curto; CS separados.',21)
text(60,1538,'Fonte: firmware/include/pins.h + docs/MONTAGEM.md • OLED assumido SSD1306 128×64 • Não é validação elétrica da montagem real.',18,'#536c76')
add('</svg>')
OUT.write_text('\n'.join(parts),encoding='utf-8')
print(OUT)

// Demonstracao autonoma. Nao acessa o servidor nem usa credenciais da maquete.
#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <MFRC522.h>
Adafruit_SSD1306 oled(128,64,&SPI,27,-1,16,4000000UL);
MFRC522 rfid(21,22);
const char* uids[]={"01020304","11223344","55667788","AABBCCDD","04112233445566","C0FFEE99"};
const char* slots[]={"A1","A2","A3","B1","B2","B3"};
int positions[6]={-1,-1,-1,-1,-1,-1};
int expected=0,destination=0;String action="entrada",feedback="Aproxime a tag azul",color="indefinida",input;
bool armed=true,present=false,scanned=false;unsigned nearCount=0,farCount=0;float distanceCm=-1;
uint32_t armedAt=0,lastMeasure=0,lastColor=0,lastDisplay=0,lastStatus=0;unsigned long redPulse=0,greenPulse=0,bluePulse=0;
void message(String s){feedback=s;Serial.println(s);}
void inventory(){Serial.println("ESTOQUE REGISTRADO:");for(int i=0;i<6;i++)Serial.printf("  CX-%02d = %s\n",i+1,positions[i]<0?"FORA":slots[positions[i]]);}
void help(){Serial.println("\nMUNDO SENAI | SIMULACAO AUTONOMA\nComandos (Enter envia):\n entrada 1 A1\n mover 1 B2\n saida 1\n cancelar\n estoque\n ajuda\nCaixas 1..6: Blue, Green, Yellow, Red, NFC, Key Fob.\nAjuste HC-SR04 a 3cm e use Tap no RFID.\nEntre leituras: afaste para 10cm por 1s e volte a 3cm.\nCor e entrada optica virtual: clique no TCS3200.\nPrimeira operacao preparada: entrada CX-01 A1.\n");}
int slotIndex(String s){s.toUpperCase();for(int i=0;i<6;i++)if(s==slots[i])return i;return -1;}
void command(String s){
 s.trim();s.toLowerCase();if(s=="ajuda"){help();return;}if(s=="estoque"){inventory();return;}
 if(s=="cancelar"){armed=false;message("Operacao cancelada");return;}
 char op[16]={0},slot[8]={0};int box=0;int fields=sscanf(s.c_str(),"%15s %d %7s",op,&box,slot);
 String a=op;int target=slotIndex(slot);
 if(box<1||box>6||!((a=="saida"&&fields==2)||((a=="entrada"||a=="mover")&&fields==3&&target>=0))){message("Comando invalido. Digite ajuda.");return;}
 if(armed){message("Operacao pendente: use cancelar primeiro.");return;}
 if(a=="entrada"&&positions[box-1]>=0){message("Caixa ja esta no estoque");return;}
 if(a!="entrada"&&positions[box-1]<0){message("Caixa esta fora do estoque");return;}
 if(a!="saida")for(int i=0;i<6;i++)if(positions[i]==target){message("Vaga ocupada");return;}
 action=a;expected=box-1;destination=a=="saida"?-1:target;armed=true;armedAt=millis();
 message("PREPARADO: "+action+" CX-0"+String(box)+" -> "+(destination<0?"FORA":slots[destination]));
}
unsigned long colorPulse(bool a,bool b){digitalWrite(13,a);digitalWrite(14,b);delayMicroseconds(500);pulseIn(34,LOW,20000);return pulseIn(34,LOW,20000);}
void measure(){
 digitalWrite(25,LOW);delayMicroseconds(2);digitalWrite(25,HIGH);delayMicroseconds(10);digitalWrite(25,LOW);
 unsigned long duration=pulseIn(26,HIGH,26000);distanceCm=duration?duration*.0343f/2:-1;
 if(distanceCm>0&&distanceCm<4){nearCount++;farCount=0;if(nearCount>=2)present=true;}
 else if(distanceCm<0||distanceCm>6){nearCount=0;farCount++;if(farCount>=3){present=false;scanned=false;color="indefinida";}}
 else nearCount=farCount=0;
}
void readColor(){
 if(!present)return;redPulse=colorPulse(LOW,LOW);greenPulse=colorPulse(HIGH,HIGH);bluePulse=colorPulse(LOW,HIGH);
 if(!redPulse||!greenPulse||!bluePulse){color="indefinida";return;}
 float r=1.f/redPulse,g=1.f/greenPulse,b=1.f/bluePulse;
 if(r>b*1.4f&&g>b*1.4f&&min(r,g)/max(r,g)>.65f)color="amarelo";
 else if(r>g*1.2f&&r>b*1.2f)color="vermelho";
 else if(g>r*1.2f&&g>b*1.2f)color="verde";
 else if(b>r*1.2f&&b>g*1.2f)color="azul";else color="indefinida";
}
void scan(){
 if(!present||scanned)return;digitalWrite(16,HIGH);
 if(!rfid.PICC_IsNewCardPresent()||!rfid.PICC_ReadCardSerial())return;
 String uid;for(byte i=0;i<rfid.uid.size;i++){if(rfid.uid.uidByte[i]<16)uid+="0";uid+=String(rfid.uid.uidByte[i],HEX);}uid.toUpperCase();
 rfid.PICC_HaltA();rfid.PCD_StopCrypto1();scanned=true;Serial.println("RFID UID="+uid);
 int box=-1;for(int i=0;i<6;i++)if(uid==uids[i])box=i;
 if(box<0){message("Tag nao cadastrada");return;}
 if(!armed){message("Prepare uma operacao na serial");return;}
 if(box!=expected){message("Tag errada: esperava CX-0"+String(expected+1));return;}
 if(millis()-armedAt>60000){armed=false;message("Operacao expirada");return;}
 if(destination>=0)for(int i=0;i<6;i++)if(i!=box&&positions[i]==destination){message("Conflito: vaga ocupada");return;}
 positions[box]=destination;armed=false;message("OK "+action+" CX-0"+String(box+1)+" "+(destination<0?"FORA":slots[destination]));inventory();
}
void screen(){
 oled.clearDisplay();oled.setTextColor(SSD1306_WHITE);oled.setTextSize(1);oled.setCursor(0,0);oled.println("ESTOQUE | MUNDO SENAI");oled.drawFastHLine(0,10,128,SSD1306_WHITE);
 oled.setCursor(0,14);oled.print("Sensor: ");if(distanceCm<0)oled.println("sem eco");else{oled.print(distanceCm,1);oled.println(" cm");}
 oled.println("Cor: "+color);
 if(armed){oled.println(action+" CX-0"+String(expected+1));oled.println("Destino: "+String(destination<0?"FORA":slots[destination]));}
 else{oled.println(feedback);int total=0;for(int i=0;i<6;i++)if(positions[i]>=0)total++;oled.println("Ocupacao: "+String(total)+"/6");}
 oled.display();
}
void setup(){
 Serial.begin(115200);pinMode(16,OUTPUT);pinMode(21,OUTPUT);digitalWrite(16,HIGH);digitalWrite(21,HIGH);SPI.begin(18,19,23);
 oled.begin(SSD1306_SWITCHCAPVCC,0,true,false);digitalWrite(16,HIGH);rfid.PCD_Init();Serial.printf("RC522 versao: 0x%02X\n",rfid.PCD_ReadRegister(MFRC522::VersionReg));
 pinMode(25,OUTPUT);pinMode(26,INPUT);pinMode(34,INPUT);for(int p:{32,33,13,14})pinMode(p,OUTPUT);digitalWrite(32,HIGH);digitalWrite(33,LOW);
 help();armedAt=millis();screen();
}
void loop(){
 while(Serial.available()){char c=Serial.read();if(c=='\n'){command(input);input="";}else if(c!='\r'&&input.length()<100)input+=c;}
 uint32_t now=millis();if(now-lastMeasure>=200){lastMeasure=now;measure();}if(now-lastColor>=700){lastColor=now;readColor();}
 scan();if(armed&&now-armedAt>60000){armed=false;message("Operacao expirada; prepare novamente");}
 if(now-lastDisplay>=300){lastDisplay=now;screen();}
 if(now-lastStatus>=3000){lastStatus=now;Serial.printf("SENSORES distancia=%.1fcm presenca=%s cor=%s RGB=%lu/%lu/%lu\n",distanceCm,present?"sim":"nao",color.c_str(),redPulse,greenPulse,bluePulse);}
 delay(5);
}

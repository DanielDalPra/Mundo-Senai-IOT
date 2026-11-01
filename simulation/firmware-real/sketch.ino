// Gerado de firmware/src/main.cpp. Mesma logica do firmware real.
#define ESTOQUE_SIMULATION 1
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <Preferences.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include "pins.h"
#ifdef ESTOQUE_SIMULATION
#include "config.sim.h"
#elif defined(ESTOQUE_LOCAL_CONFIG)
#include "../include/config.h"
#else
#include "../include/config.example.h"
#endif
#ifndef TRANSPORT_SERIAL
#define TRANSPORT_SERIAL 0
#endif
#ifndef SERIAL_REPLY_TIMEOUT_MS
#define SERIAL_REPLY_TIMEOUT_MS 4000
#endif

Adafruit_SSD1306 display(128,64,&SPI,OLED_DC,OLED_RESET_PIN,OLED_CS,4000000UL);
MFRC522 reader(RFID_CS,RFID_RST);
Preferences preferences;
bool oledOk=false,rfidOk=false,present=false,scannedThisVisit=false;
bool lastServerOk=false;
float distanceCm=-1;
unsigned long pulseR=0,pulseG=0,pulseB=0;
uint8_t nearCount=0,farCount=0;
uint32_t lastDistance=0,lastColor=0,lastRFID=0,lastReport=0,lastDisplay=0,lastWifi=0,lastInit=0;
String color="indefinida",commandId="",commandAction="",commandBox="",commandSlot="";
String pendingScan="",feedback="Iniciando...";
uint32_t feedbackUntil=0,commandReceivedAt=0,commandRemainingMs=0;
uint32_t serialRequestId=0,serialSentAt=0;
bool serialWaiting=false;
bool serialOversized=false;
String serialInput;

void message(const String &text){feedback=text;feedbackUntil=millis()+5000;Serial.println(text);}
float measureDistance(){digitalWrite(US_TRIG,LOW);delayMicroseconds(2);digitalWrite(US_TRIG,HIGH);delayMicroseconds(10);digitalWrite(US_TRIG,LOW);const unsigned long duration=pulseIn(US_ECHO,HIGH,26000);return duration?duration*0.0343f/2.0f:-1.0f;}
unsigned long colorPulse(bool s2,bool s3){digitalWrite(COLOR_S2,s2);digitalWrite(COLOR_S3,s3);delayMicroseconds(500);pulseIn(COLOR_OUT,LOW,20000);return pulseIn(COLOR_OUT,LOW,20000);}
void readColor(){
 if(!COLOR_ENABLED||!present){color="indefinida";pulseR=pulseG=pulseB=0;return;}
 pulseR=colorPulse(LOW,LOW);pulseG=colorPulse(HIGH,HIGH);pulseB=colorPulse(LOW,HIGH);
 // pulseIn retorna duração em microssegundos, não frequência. Zero é timeout.
 if(!pulseR||!pulseG||!pulseB){color="indefinida";return;}
 const float r=COLOR_GAIN_R/pulseR,g=COLOR_GAIN_G/pulseG,b=COLOR_GAIN_B/pulseB;
 if(r>b*1.4f&&g>b*1.4f&&min(r,g)/max(r,g)>.65f)color="amarelo";
 else if(r>g*1.2f&&r>b*1.2f)color="vermelho";
 else if(g>r*1.2f&&g>b*1.2f)color="verde";
 else if(b>r*1.2f&&b>g*1.2f)color="azul";
 else color="indefinida";
 Serial.printf("Cor %s | pulsos R=%lu G=%lu B=%lu us\n",color.c_str(),pulseR,pulseG,pulseB);
}
void readPresence(){distanceCm=measureDistance();if(distanceCm>0&&distanceCm<PRESENCE_ENTER_CM){nearCount=min(nearCount+1,3);farCount=0;if(nearCount>=2)present=true;}
 else if(distanceCm<0||distanceCm>PRESENCE_EXIT_CM){farCount=min(farCount+1,4);nearCount=0;if(farCount>=3){present=false;scannedThisVisit=false;color="indefinida";}}
 else{nearCount=farCount=0;}
}
String newEventId(){char buffer[40];snprintf(buffer,sizeof(buffer),"%08lx%08lx-%08lx",(unsigned long)esp_random(),(unsigned long)esp_random(),(unsigned long)millis());return String(buffer);}
void scanTag(){
 if(!rfidOk||!present||scannedThisVisit||pendingScan.length())return;
 digitalWrite(OLED_CS,HIGH);
 if(!reader.PICC_IsNewCardPresent()||!reader.PICC_ReadCardSerial())return;
 String uid="";for(byte i=0;i<reader.uid.size;i++){if(reader.uid.uidByte[i]<16)uid+="0";uid+=String(reader.uid.uidByte[i],HEX);}uid.toUpperCase();
 reader.PICC_HaltA();reader.PCD_StopCrypto1();scannedThisVisit=true;
 StaticJsonDocument<384> event;event["eventId"]=newEventId();event["uid"]=uid;
 if(commandId.length()&&millis()-commandReceivedAt<commandRemainingMs)event["commandId"]=commandId;else event["commandId"]=nullptr;
 serializeJson(event,pendingScan);preferences.putString("pending",pendingScan);
 message("TAG "+uid);lastReport=0;
}
void applyReply(JsonObject response){
  if(response["ok"]==true&&response["serverTime"].is<int64_t>()){
   lastServerOk=true;
   if(pendingScan.length()&&!response["result"].isNull()){
    if(!response["result"]["accepted"].is<bool>()||!response["result"]["code"].is<const char*>()||!response["result"]["message"].is<const char*>()){
     lastServerOk=false;Serial.println("Resultado invalido; leitura preservada");return;
    }
    message(response["result"]["message"].as<String>());
    // Só apagar após resposta válida. Reenvio mantém o mesmo eventId.
    pendingScan="";preferences.remove("pending");
   }
   const JsonObject cmd=response["command"].as<JsonObject>();
   if(cmd.isNull()){commandId="";commandAction="";commandBox="";commandSlot="";commandRemainingMs=0;}
   else{commandId=cmd["id"].as<String>();commandAction=cmd["action"].as<String>();commandBox=cmd["boxId"].as<String>();commandSlot=cmd["slot"].isNull()?"fora":cmd["slot"].as<String>();
    const int64_t remaining=cmd["expiresAt"].as<int64_t>()-response["serverTime"].as<int64_t>();commandRemainingMs=remaining>0?(uint32_t)min((int64_t)60000,remaining):0;commandReceivedAt=millis();}
  }else{lastServerOk=false;Serial.println("Resposta do servidor invalida");}
}
void readSerialReply(){
 if(!TRANSPORT_SERIAL)return;
 while(Serial.available()){
  const char c=Serial.read();
  if(c=='\n'){
   if(!serialOversized&&serialInput.startsWith("APRENDE_REPLY ")){
    StaticJsonDocument<2560> envelope;
    if(!deserializeJson(envelope,serialInput.substring(14))&&serialWaiting&&envelope["requestId"].is<uint32_t>()&&envelope["requestId"].as<uint32_t>()==serialRequestId&&envelope["reply"].is<JsonObject>()){
     serialWaiting=false;applyReply(envelope["reply"].as<JsonObject>());
    }
   }
   serialInput="";
   serialOversized=false;
  }else if(c!='\r'&&!serialOversized){
   if(serialInput.length()<3000)serialInput+=c;
   else{serialInput="";serialOversized=true;} // Discard the WHOLE line, including a valid-looking suffix.
  }
 }
 if(serialWaiting&&millis()-serialSentAt>SERIAL_REPLY_TIMEOUT_MS){serialWaiting=false;lastServerOk=false;}
}
void report(){
 if(TRANSPORT_SERIAL&&serialWaiting)return;
 if(!TRANSPORT_SERIAL&&WiFi.status()!=WL_CONNECTED){lastServerOk=false;return;}
 StaticJsonDocument<1536> payload;payload["deviceId"]=DEVICE_ID;JsonObject t=payload.createNestedObject("telemetry");
 t["present"]=present;if(distanceCm<0)t["distanceCm"]=nullptr;else t["distanceCm"]=roundf(distanceCm*10)/10;
 t["color"]=color;t["rssi"]=TRANSPORT_SERIAL?0:WiFi.RSSI();t["rfidOk"]=rfidOk;t["oledOk"]=oledOk;
 JsonArray p=t.createNestedArray("pulses");p.add(pulseR);p.add(pulseG);p.add(pulseB);
 if(pendingScan.length()){StaticJsonDocument<384> event;if(!deserializeJson(event,pendingScan))payload["scan"].set(event.as<JsonObject>());else{Serial.println("Leitura armazenada invalida; revisar NVS");return;}}
 if(TRANSPORT_SERIAL){
  serialRequestId++;serialSentAt=millis();serialWaiting=true;
  Serial.print("APRENDE_REPORT {\"requestId\":");Serial.print(serialRequestId);Serial.print(",\"report\":");serializeJson(payload,Serial);Serial.println("}");return;
 }
 WiFiClient client;HTTPClient http;http.setConnectTimeout(1000);http.setTimeout(1200);
 if(!http.begin(client,String(SERVER_URL)+"/api/device/report")){lastServerOk=false;return;}
 http.addHeader("Content-Type","application/json");http.addHeader("Authorization",String("Bearer ")+DEVICE_TOKEN);
 String request;serializeJson(payload,request);const int status=http.POST(request);
 if(status==200){StaticJsonDocument<2048> response;
  if(!deserializeJson(response,http.getString()))applyReply(response.as<JsonObject>());
  else{lastServerOk=false;Serial.println("JSON do servidor invalido; leitura preservada");}
 }else{lastServerOk=false;Serial.printf("HTTP %d. Evento pendente preservado.\n",status);if(status==401||status==403)message("Verifique DEVICE_TOKEN");}
 http.end();
}
void drawDisplay(){if(!oledOk)return;digitalWrite(RFID_CS,HIGH);display.clearDisplay();display.setTextSize(1);display.setTextColor(SSD1306_WHITE);display.setCursor(0,0);display.println("ESTOQUE INTELIGENTE");display.drawFastHLine(0,10,128,SSD1306_WHITE);display.setCursor(0,14);
 if(TRANSPORT_SERIAL)display.println(lastServerOk?"USB: servidor conectado":"USB: execute npm run usb");
 else display.println(WiFi.status()!=WL_CONNECTED?"WiFi desconectado":lastServerOk?"Servidor conectado":"Servidor indisponivel");
 if((int32_t)(feedbackUntil-millis())>0)display.println(feedback);
 else if(pendingScan.length())display.println("Leitura aguardando envio");
 else if(commandId.length()&&millis()-commandReceivedAt<commandRemainingMs){display.println(commandAction+" "+commandBox);display.println("Destino: "+commandSlot);}
 else display.println("Prepare no painel");
 display.println(present?"Caixa na estacao":"Aproxime uma caixa");display.print("Cor: ");display.println(color);display.display();
}
void initReader(){digitalWrite(OLED_CS,HIGH);reader.PCD_Init();const byte v=reader.PCD_ReadRegister(MFRC522::VersionReg);rfidOk=v==0x88||v==0x90||v==0x91||v==0x92||v==0x12;Serial.printf("RC522: 0x%02X (%s)\n",v,rfidOk?"versao reconhecida":"falha ou versao desconhecida; verificar fios");}
void setup(){
 Serial.begin(115200);pinMode(OLED_CS,OUTPUT);pinMode(RFID_CS,OUTPUT);digitalWrite(OLED_CS,HIGH);digitalWrite(RFID_CS,HIGH);
 SPI.begin(SPI_SCK,SPI_MISO,SPI_MOSI);
 if(OLED_ENABLED)oledOk=display.begin(SSD1306_SWITCHCAPVCC,0,true,false);
 initReader();pinMode(US_TRIG,OUTPUT);pinMode(US_ECHO,INPUT);digitalWrite(US_TRIG,LOW);
 for(int pin:{COLOR_S0,COLOR_S1,COLOR_S2,COLOR_S3})pinMode(pin,OUTPUT);
 pinMode(COLOR_OUT,INPUT);
 digitalWrite(COLOR_S0,HIGH);digitalWrite(COLOR_S1,LOW); // escala 20%
 preferences.begin("estoque",false);pendingScan=preferences.getString("pending","");
 if(!TRANSPORT_SERIAL){WiFi.mode(WIFI_STA);WiFi.setAutoReconnect(true);WiFi.persistent(false);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);lastWifi=millis();}
 message("Pronto. Veja o painel");
}
void loop(){const uint32_t now=millis();
 readSerialReply();
 static uint32_t lastDiagnostic=0;
 if(now-lastDiagnostic>=3000){lastDiagnostic=now;
  Serial.printf("DIAG wifi=%d ip=%s sinal=%d servidor=%s distancia=%.1f presenca=%s rfid=%s oled_init=%s cor=%s\n",
   (int)WiFi.status(),WiFi.localIP().toString().c_str(),WiFi.RSSI(),lastServerOk?"ok":"falha",distanceCm,present?"sim":"nao",rfidOk?"responde":"falha",oledOk?"ok":"falha",color.c_str());
 }
 if(now-lastDistance>=200){lastDistance=now;readPresence();}
 if(now-lastColor>=1000){lastColor=now;readColor();}
 if(now-lastRFID>=150){lastRFID=now;scanTag();}
 if(now-lastReport>=2000){lastReport=now;report();}
 if(now-lastDisplay>=300){lastDisplay=now;drawDisplay();}
 if(!TRANSPORT_SERIAL&&WiFi.status()!=WL_CONNECTED&&now-lastWifi>=10000){lastWifi=now;WiFi.reconnect();}
 if(!rfidOk&&now-lastInit>=10000){lastInit=now;initReader();}
 delay(2);
}

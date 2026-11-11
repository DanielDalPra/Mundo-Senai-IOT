#define ESTOQUE_SIMULATION 1
#include "../../firmware/src/main.cpp"
#include <stdexcept>

void require(bool value,const char* message){if(!value)throw std::runtime_error(message);}
void noTagFor(uint32_t ms){reader.card=false;clockMs+=ms;scanTag();}
void colorSamples(unsigned long r,unsigned long g,unsigned long b){pulses.clear();for(auto value:{r,g,b})for(int i=0;i<16;i++)pulses.push_back(value);}
void reply(const String &body,uint32_t id=1){serialWaiting=true;serialRequestId=id;serialSentAt=millis();serialInput="";Serial.input="APRENDE_REPLY {\"requestId\":"+std::to_string(id)+",\"reply\":"+body+"}\n";readSerialReply();}
void pending(){pendingScan="{\"eventId\":\"native-test-0001\",\"uid\":\"01020304\",\"commandId\":null}";preferences.putString("pending",pendingScan);}
const String ack="{\"ok\":true,\"serverTime\":1000000,\"command\":null,\"result\":{\"accepted\":true,\"code\":\"applied\",\"message\":\"OK\"}}";
void unit(const std::string &name){
 if(name=="color-bench"){
  require(COLOR_TEST_MODE,"Bench test must use separate build");present=false;colorSamples(260,240,60);readColor();require(color=="azul","Bench must read colors without presence");
  present=rfidOk=reader.card=true;scanTag();require(pendingScan.empty(),"Bench must not register movements");
  present=false;clockMs=3000;colorSamples(240,60,250);Serial.output="";loop();
  require(color=="verde"&&Serial.output.find("APRENDE_REPORT ")==std::string::npos,"Bench loop must read color without sending stock reports");
 }else if(name=="presence"){
  initReader();reader.card=true;scanTag();require(present&&!pendingScan.empty(),"RFID tag must establish presence and generate a scan");
  String first=pendingScan;reply(ack);scanTag();require(pendingScan.empty(),"A held tag must not produce a second scan");
  noTagFor(1000);require(present&&scannedThisVisit,"Short signal loss must retain the visit");
  noTagFor(501);require(!present&&!scannedThisVisit,"Tag removal must rearm the reader");
  reader.collision=true;scanTag();require(pendingScan.empty(),"Collision must not create a scan");
  reader.collision=false;reader.card=true;scanTag();require(!pendingScan.empty()&&pendingScan!=first,"Returning a tag must produce a new event");
 }else if(name=="colors"){
  present=true;
  colorCalibrated=false;colorSamples(60,240,250);readColor();
  require(color=="indefinida"&&pulseR==60,"Uncalibrated sensor must keep raw pulses without asserting a color");
  colorCalibrated=true;
  struct C{unsigned long r,g,b;const char* color;};
  for(auto c:{C{260,240,60,"azul"},C{240,60,250,"verde"},C{60,240,250,"vermelho"},C{60,65,250,"amarelo"},C{225,215,169,"indefinida"},C{2586,1953,1939,"verde"},C{108,108,84,"indefinida"},C{674,544,305,"azul"},C{0,100,60,"indefinida"}}){
   colorSamples(c.r,c.g,c.b);readColor();require(color==c.color,c.color);
  }
  colorSamples(260,240,60);pulses[2]=1;pulses[3]=9000;readColor();
  require(color=="azul"&&pulseR==260,"Isolated extreme pulses must not change measured color");
  colorSamples(260,240,60);pulses[1]=pulses[2]=pulses[3]=0;readColor();
  require(color=="azul"&&pulseR==260,"Three missing pulses should not discard a valid channel");
  colorSamples(260,240,60);pulses[1]=pulses[2]=pulses[3]=pulses[4]=0;readColor();
  require(color=="indefinida"&&pulseR==0,"Too many missing pulses must not invent a color");
  colorSamples(0,0,0);Serial.output="";readColor();
  require(color=="indefinida"&&pins[COLOR_S0]==HIGH&&pins[COLOR_S1]==LOW&&Serial.output.find("retomada de sinal")!=std::string::npos,"Repeated loss must reset sensor scaling safely");
  colorSamples(260,240,60);readColor();require(color=="azul","A valid signal must be accepted after recovery");
  present=false;colorSamples(260,240,60);readColor();
  require(color=="azul"&&pulseR==260,"Color sensor must work without ultrasonic presence");
  oledOk=true;drawDisplay();require(display.text.str().find("[0,14]Cor: azul")!=std::string::npos,"OLED must show sensor color without an RFID tag");
  present=true;drawDisplay();require(display.text.str().find("[0,14]Cor: azul")!=std::string::npos,"OLED must also show sensor color when a tag is near");
  colorSamples(0,0,0);readColor();drawDisplay();
  require(display.text.str().find("[0,14]Cor: sem sinal")!=std::string::npos,"OLED must distinguish a missing color signal");
 }else if(name=="rfid"){
  initReader();reader.card=true;commandId="command-1";commandReceivedAt=millis();commandRemainingMs=30000;
  scanTag();StaticJsonDocument<384> event;require(!deserializeJson(event,pendingScan),"Stored scan must be JSON");
  require(event["uid"]=="01020304"&&event["commandId"]=="command-1","UID and active command must match");
  require(preferences.getString("pending","")==pendingScan,"Scan must be stored in NVS");
  const String original=pendingScan;reader.card=true;scanTag();require(pendingScan==original,"Only one event per visit");
  reply(ack);scanTag();require(pendingScan.empty(),"Ack cannot permit a second scan during the same visit");
  reader.uid.uidByte[3]=5;scanTag();require(pendingScan.find("01020305")!=String::npos,"A different tag must start a new visit");
 }else if(name=="expired-command"){
  rfidOk=present=reader.card=true;commandId="expired";commandReceivedAt=millis();commandRemainingMs=100;clockMs+=101;
  scanTag();StaticJsonDocument<384> e;deserializeJson(e,pendingScan);require(e["commandId"].isNull(),"Expired command must not attach to a tag");
 }else if(name=="reader-health"){
  for(byte v:{0x00,0xFF,0xC0}){reader.version=v;initReader();require(!rfidOk,"Invalid reader version must fail");}
  for(byte v:{0x88,0x90,0x91,0x92,0x12,0xB2}){reader.version=v;initReader();require(rfidOk,"Known reader version must pass");}
  present=reader.card=true;scanTag();
  require(!pendingScan.empty(),"FM17522 0xB2 must allow a tag event when presence is confirmed");
 }else if(name=="ack"){
  pending();reply("{\"ok\":true,\"serverTime\":1000000,\"result\":{\"accepted\":true}}");require(!pendingScan.empty()&&!lastServerOk,"Malformed result must preserve the event");
  reply("{\"ok\":false,\"serverTime\":1000000}");require(!pendingScan.empty(),"Rejected reply must preserve event");
  reply(ack);require(pendingScan.empty()&&!preferences.values.count("pending")&&lastServerOk,"Valid acknowledgement must clear NVS");
 }else if(name=="timeout"){
  pending();serialWaiting=true;serialRequestId=9;serialSentAt=millis();clockMs+=SERIAL_REPLY_TIMEOUT_MS+1;readSerialReply();
  require(!serialWaiting&&!pendingScan.empty()&&!lastServerOk,"Timeout must preserve event and unblock retry");
  Serial.input="APRENDE_REPLY {\"requestId\":9,\"reply\":"+ack+"}\n";readSerialReply();require(!pendingScan.empty(),"Late response must not acknowledge a timed-out request");
  report();require(serialWaiting&&Serial.output.find("native-test-0001")!=std::string::npos,"Retry must retain event ID");
 }else if(name=="wrong-request"){
  pending();serialWaiting=true;serialRequestId=7;serialSentAt=millis();Serial.input="APRENDE_REPLY {\"requestId\":8,\"reply\":"+ack+"}\n";readSerialReply();
  require(!pendingScan.empty()&&serialWaiting,"Wrong request ID must not acknowledge a scan");
 }else if(name=="oversized-reply"){
  pending();serialWaiting=true;serialRequestId=1;serialSentAt=millis();
  Serial.input=String(3001,'x')+"APRENDE_REPLY {\"requestId\":1,\"reply\":"+ack+"}\n";readSerialReply();
  require(!pendingScan.empty(),"Oversized line suffix must NEVER be interpreted as an acknowledgement");
 }else if(name=="boot-recovery"){
  pending();String old=pendingScan;pendingScan="";setup();require(pendingScan==old,"Boot must restore pending event from NVS");reader.card=true;scanTag();require(scannedThisVisit&&pendingScan==old,"Held pending tag must be remembered");report();
  require(Serial.output.find("native-test-0001")!=std::string::npos,"Recovered event must be sent");
  reply(ack);scanTag();require(pendingScan.empty(),"Acknowledgement after reboot must not repeat a held tag");
 }else if(name=="wifi"){
  require(!TRANSPORT_SERIAL,"Test must compile with Wi-Fi transport");pending();
  WiFi.statusValue=0;report();require(!pendingScan.empty()&&!lastServerOk,"Offline Wi-Fi must preserve event");
  WiFi.statusValue=WL_CONNECTED;httpStatus=500;report();require(!pendingScan.empty()&&!lastServerOk,"HTTP error must preserve event");
  httpStatus=200;httpReply="invalid JSON";report();require(!pendingScan.empty()&&!lastServerOk,"Invalid HTTP JSON must preserve event");
  httpReply="{\"ok\":true,\"serverTime\":1000000,\"result\":{\"accepted\":true}}";report();require(!pendingScan.empty()&&!lastServerOk,"Invalid result must preserve event over HTTP too");
  httpReply=ack;report();require(pendingScan.empty()&&lastServerOk,"Valid HTTP reply must clear event");
  require(httpRequest.find("native-test-0001")!=std::string::npos,"HTTP retry must use original event ID");
 }else if(name=="command-clock"){
  reply("{\"ok\":true,\"serverTime\":1000000,\"command\":{\"id\":\"cmd\",\"action\":\"entrada\",\"boxId\":\"CX-01\",\"slot\":\"A1\",\"expiresAt\":1030000}}");
  require(commandId=="cmd"&&commandRemainingMs==30000,"Command duration must use server time, not ESP32 uptime");
  reply("{\"ok\":true,\"serverTime\":1000000,\"command\":null}");require(commandId.empty()&&!commandRemainingMs,"Cancellation must clear command");
 }else throw std::runtime_error("Unknown test");
}

int main(int argc,char**argv){
 try{
  if(argc>1&&std::string(argv[1])!="--protocol"){unit(argv[1]);std::cout<<"PASS "<<argv[1]<<'\n';return 0;}
  // JSON commands drive actual firmware functions; mock pins are the only substituted inputs.
  std::string line;
  while(std::getline(std::cin,line)){
   StaticJsonDocument<8192> in;require(!deserializeJson(in,line),"Bad host command");const std::string op=in["op"].as<std::string>();Serial.output="";
   if(op=="setup")setup();
   else if(op=="remove")noTagFor(RFID_RELEASE_MS+1);
   else if(op=="tag"){
    const std::string uid=in["uid"].as<std::string>();require(uid.size()%2==0&&uid.size()<=20,"Invalid test UID");reader.uid.size=uid.size()/2;
    for(byte i=0;i<reader.uid.size;i++)reader.uid.uidByte[i]=std::strtoul(uid.substr(i*2,2).c_str(),nullptr,16);
    reader.card=true;scanTag();
   }else if(op=="color"){
    present=in["present"].is<bool>()?in["present"].as<bool>():true;colorCalibrated=true;
    colorSamples(in["r"].as<unsigned long>(),in["g"].as<unsigned long>(),in["b"].as<unsigned long>());readColor();
   }else if(op=="report")report();
   else if(op=="reply"){Serial.input=in["line"].as<String>();readSerialReply();}
   else if(op=="advance"){clockMs+=in["ms"].as<uint32_t>();readSerialReply();}
   else if(op=="reboot"){pendingScan="";present=false;scannedThisVisit=false;serialWaiting=false;commandId="";clockMs=100;setup();}
   else require(op=="state","Unknown operation");
   StaticJsonDocument<8192> out;out["serial"]=Serial.output;out["pending"]=pendingScan;out["stored"]=preferences.getString("pending","");out["present"]=present;out["serverOk"]=lastServerOk;out["commandId"]=commandId;out["waiting"]=serialWaiting;out["color"]=color;serializeJson(out,std::cout);std::cout<<std::endl;
  }
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}
}

#define ESTOQUE_SIMULATION 1
#include "../../firmware/src/main.cpp"
#include <stdexcept>

void require(bool value,const char* message){if(!value)throw std::runtime_error(message);}
void distance(float cm){pulses.push_back(cm<0?0:static_cast<unsigned long>(cm*2/0.0343f));readPresence();}
void reply(const String &body,uint32_t id=1){serialWaiting=true;serialRequestId=id;serialSentAt=millis();serialInput="";Serial.input="APRENDE_REPLY {\"requestId\":"+std::to_string(id)+",\"reply\":"+body+"}\n";readSerialReply();}
void pending(){pendingScan="{\"eventId\":\"native-test-0001\",\"uid\":\"01020304\",\"commandId\":null}";preferences.putString("pending",pendingScan);}
const String ack="{\"ok\":true,\"serverTime\":1000000,\"command\":null,\"result\":{\"accepted\":true,\"code\":\"applied\",\"message\":\"OK\"}}";
void unit(const std::string &name){
 if(name=="color-bench"){
  require(COLOR_TEST_MODE,"Bench test must use separate build");present=false;pulses={260,260,240,240,60,60};readColor();require(color=="azul","Bench must read colors without presence");
  present=rfidOk=reader.card=true;scanTag();require(pendingScan.empty(),"Bench must not register movements");
  present=false;clockMs=3000;pulses={240,240,60,60,250,250};Serial.output="";loop();
  require(color=="verde"&&Serial.output.find("APRENDE_REPORT ")==std::string::npos,"Bench loop must read color without sending stock reports");
 }else if(name=="presence"){
  distance(3);require(!present,"One near sample must not detect a box");distance(3);require(present,"Two near samples must detect a box");
  scannedThisVisit=true;distance(5);require(present&&scannedThisVisit,"Dead band must retain visit");
  distance(10);distance(10);require(present,"Two far samples must retain presence");distance(10);require(!present&&!scannedThisVisit,"Three far samples must end the visit");
  distance(3);distance(3);distance(-1);distance(-1);distance(-1);require(!present,"Missing echoes must clear presence");
 }else if(name=="colors"){
  present=true;
  struct C{unsigned long r,g,b;const char* color;};
  for(auto c:{C{260,240,60,"azul"},C{240,60,250,"verde"},C{60,240,250,"vermelho"},C{60,65,250,"amarelo"},C{100,100,100,"indefinida"},C{108,108,84,"indefinida"},C{674,544,305,"azul"},C{0,100,60,"indefinida"}}){
   pulses={c.r,c.r,c.g,c.g,c.b,c.b};readColor();require(color==c.color,c.color);
  }
  present=false;readColor();require(color=="indefinida"&&!pulseR&&!pulseG&&!pulseB,"No color without presence");
 }else if(name=="rfid"){
  initReader();reader.card=true;scanTag();require(pendingScan.empty(),"No RFID scan without presence");
  present=true;commandId="command-1";commandReceivedAt=millis();commandRemainingMs=30000;
  scanTag();StaticJsonDocument<384> event;require(!deserializeJson(event,pendingScan),"Stored scan must be JSON");
  require(event["uid"]=="01020304"&&event["commandId"]=="command-1","UID and active command must match");
  require(preferences.getString("pending","")==pendingScan,"Scan must be stored in NVS");
  const String original=pendingScan;reader.card=true;scanTag();require(pendingScan==original,"Only one event per visit");
  pendingScan="";reader.card=true;scanTag();require(pendingScan.empty(),"Ack cannot permit a second scan during the same visit");
 }else if(name=="expired-command"){
  rfidOk=present=reader.card=true;commandId="expired";commandReceivedAt=millis();commandRemainingMs=100;clockMs+=101;
  scanTag();StaticJsonDocument<384> e;deserializeJson(e,pendingScan);require(e["commandId"].isNull(),"Expired command must not attach to a tag");
 }else if(name=="reader-health"){
  for(byte v:{0x00,0xFF,0xC0}){reader.version=v;initReader();require(!rfidOk,"Invalid reader version must fail");}
  for(byte v:{0x88,0x90,0x91,0x92,0x12}){reader.version=v;initReader();require(rfidOk,"Known reader version must pass");}
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
  pending();String old=pendingScan;pendingScan="";setup();require(pendingScan==old,"Boot must restore pending event from NVS");report();
  require(Serial.output.find("native-test-0001")!=std::string::npos,"Recovered event must be sent");
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
   else if(op=="presence")distance(in["cm"].as<float>());
   else if(op=="tag"){
    const std::string uid=in["uid"].as<std::string>();require(uid.size()%2==0&&uid.size()<=20,"Invalid test UID");reader.uid.size=uid.size()/2;
    for(byte i=0;i<reader.uid.size;i++)reader.uid.uidByte[i]=std::strtoul(uid.substr(i*2,2).c_str(),nullptr,16);
    reader.card=true;scanTag();
   }else if(op=="report")report();
   else if(op=="reply"){Serial.input=in["line"].as<String>();readSerialReply();}
   else if(op=="advance"){clockMs+=in["ms"].as<uint32_t>();readSerialReply();}
   else if(op=="reboot"){pendingScan="";present=false;scannedThisVisit=false;serialWaiting=false;commandId="";clockMs=100;setup();}
   else require(op=="state","Unknown operation");
   StaticJsonDocument<8192> out;out["serial"]=Serial.output;out["pending"]=pendingScan;out["stored"]=preferences.getString("pending","");out["present"]=present;out["serverOk"]=lastServerOk;out["commandId"]=commandId;out["waiting"]=serialWaiting;serializeJson(out,std::cout);std::cout<<std::endl;
  }
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}
}

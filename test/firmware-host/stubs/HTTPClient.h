#pragma once
static int httpStatus=200;
static String httpReply="{}",httpRequest;
struct HTTPClient {
 void setConnectTimeout(int){} void setTimeout(int){}
 bool begin(WiFiClient&,const String&){return true;}
 void addHeader(const char*,const String&){}
 int POST(const String &r){httpRequest=r;return httpStatus;}
 String getString(){return httpReply;}
 void end(){}
};

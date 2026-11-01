#pragma once
constexpr int WL_CONNECTED=3,WIFI_STA=1;
struct WiFiClient {};
struct WiFiMock {
 int statusValue=WL_CONNECTED;
 int status(){return statusValue;}
 int RSSI(){return -48;}
 String localIP(){return "127.0.0.1";}
 void mode(int){} void setAutoReconnect(bool){} void persistent(bool){}
 void begin(const char*,const char*){} void reconnect(){}
} WiFi;

#pragma once
// Hardware boundary for executing the ORIGINAL firmware on the PC.
// No electrical behavior, ESP32 scheduling, or SPI timing is emulated here.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdarg>
#include <cstdlib>
#include <deque>
#include <map>
#include <sstream>
#include <string>
#include <iostream>
#include <cctype>
#include <cstring>
using byte=uint8_t;
using std::min;
using std::max;
constexpr int LOW=0,HIGH=1,INPUT=0,OUTPUT=1,HEX=16;
class String:public std::string {
public:
 using std::string::string;
 using std::string::operator=;
 String()=default;
 String(const std::string &s):std::string(s){}
 String(unsigned int n,int base){char b[32];std::snprintf(b,sizeof(b),base==HEX?"%x":"%u",n);assign(b);}
 bool startsWith(const char* p)const{return compare(0,std::strlen(p),p)==0;}
 String substring(size_t n)const{return substr(n);}
 String substring(size_t n,size_t end)const{return substr(n,end-n);}
 String toString()const{return *this;}
 void toUpperCase(){for(char &c:*this)c=std::toupper(static_cast<unsigned char>(c));}
 int read(){return cursor<size()?static_cast<unsigned char>((*this)[cursor++]):-1;}
 size_t readBytes(char* b,size_t n){size_t k=min(n,size()-cursor);memcpy(b,data()+cursor,k);cursor+=k;return k;}
 size_t write(uint8_t b){push_back(b);return 1;}
 size_t write(const uint8_t* b,size_t n){append(reinterpret_cast<const char*>(b),n);return n;}
 mutable size_t cursor=0;
};
#include <ArduinoJson.h>
namespace ArduinoJson {
template<> struct Converter<String>{
 static void toJson(const String &s,JsonVariant d){d.set(static_cast<const std::string&>(s));}
 static String fromJson(JsonVariantConst s){const char* p=s.as<const char*>();return p?p:"";}
 static bool checkJson(JsonVariantConst s){return s.is<const char*>();}
};
}
static uint32_t clockMs=100;
static std::deque<unsigned long> pulses;
static std::map<int,int> pins;
inline uint32_t millis(){return clockMs;}
inline void delay(unsigned long ms){clockMs+=ms;}
inline void delayMicroseconds(unsigned long){}
inline void pinMode(int,int){}
inline void digitalWrite(int p,int v){pins[p]=v;}
inline unsigned long pulseIn(int,int,unsigned long){if(pulses.empty())return 0;auto p=pulses.front();pulses.pop_front();return p;}
inline uint32_t esp_random(){static uint32_t n=12345;return n=n*1664525+1013904223;}
struct SerialMock {
 std::string input,output;
 void begin(int){}
 int available(){return input.size();}
 char read(){char c=input[0];input.erase(0,1);return c;}
 template<typename T>void print(const T &v){std::ostringstream s;s<<v;output+=s.str();}
 template<typename T>void println(const T &v){print(v);output+='\n';}
 void println(){output+='\n';}
 void printf(const char* f,...){char b[4096];va_list a;va_start(a,f);vsnprintf(b,sizeof(b),f,a);va_end(a);output+=b;}
 size_t write(uint8_t b){output+=char(b);return 1;}
 size_t write(const uint8_t* b,size_t n){output.append(reinterpret_cast<const char*>(b),n);return n;}
} Serial;

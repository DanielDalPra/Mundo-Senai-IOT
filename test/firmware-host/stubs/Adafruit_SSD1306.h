#pragma once
constexpr int SSD1306_WHITE=1,SSD1306_SWITCHCAPVCC=2;
struct Adafruit_SSD1306 {
 std::ostringstream text;
 Adafruit_SSD1306(int,int,SPIMock*,int,int,int,unsigned long){}
 bool begin(int,int,bool,bool){return true;}
 void clearDisplay(){text.str("");text.clear();} void setTextSize(int){} void setTextColor(int){}
 void setCursor(int x,int y){text<<"["<<x<<","<<y<<"]";} void drawFastHLine(int,int,int,int){} void display(){}
 template<typename T>void print(const T& value){text<<value;}
 template<typename T>void println(const T& value){text<<value<<'\n';}
};

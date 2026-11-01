#pragma once
struct Preferences {
 std::map<std::string,String> values;
 bool begin(const char*,bool){return true;}
 String getString(const char* k,const char* fallback){return values.count(k)?values[k]:String(fallback);}
 size_t putString(const char* k,const String &v){values[k]=v;return v.size();}
 bool remove(const char* k){return values.erase(k);}
};

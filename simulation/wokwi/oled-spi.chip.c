// SSD1306 SPI behavioral subset used by Adafruit_SSD1306 (horizontal addressing).
// Preserves the six physical signal names. Not a full electrical SSD1306 model.
#include "wokwi-api.h"
#include <stdlib.h>
#include <string.h>
typedef struct {
 pin_t cs,dc,vcc; spi_dev_t spi; buffer_t fb; timer_t timer;
 uint8_t rx,ram[1024],command,args[2],remaining,index,col,page,colStart,colEnd,pageStart,pageEnd;
 bool on,invert,dirty; uint8_t pixels[128*64*4];
} chip_state_t;
static void draw(void *data){
 chip_state_t *c=data;if(!c->dirty)return;c->dirty=false;
 for(unsigned y=0;y<64;y++)for(unsigned x=0;x<128;x++){
  bool lit=c->on && pin_read(c->vcc) && (((c->ram[(y/8)*128+x]>>(y%8))&1)^c->invert);
  unsigned i=(y*128+x)*4;c->pixels[i]=lit?135:3;c->pixels[i+1]=lit?227:10;c->pixels[i+2]=lit?255:17;c->pixels[i+3]=255;
 }
 buffer_write(c->fb,0,c->pixels,sizeof(c->pixels));
}
static void byte_in(chip_state_t *c,uint8_t b){
 if(pin_read(c->dc)){
  if(c->page<8&&c->col<128)c->ram[c->page*128+c->col]=b;
  if(++c->col>c->colEnd){c->col=c->colStart;if(++c->page>c->pageEnd)c->page=c->pageStart;}
  c->dirty=true;return;
 }
 if(c->remaining){
  c->args[c->index++]=b;
  if(--c->remaining==0){
   if(c->command==0x21){c->colStart=c->args[0]&127;c->colEnd=c->args[1]&127;c->col=c->colStart;}
   if(c->command==0x22){c->pageStart=c->args[0]&7;c->pageEnd=c->args[1]&7;c->page=c->pageStart;}
  }return;
 }
 c->command=b;c->index=0;
 if(b==0x21||b==0x22)c->remaining=2;
 else if(b==0x20||b==0x81||b==0x8d||b==0xa8||b==0xd3||b==0xd5||b==0xd9||b==0xda||b==0xdb)c->remaining=1;
 else if(b==0xaf){c->on=true;c->dirty=true;}
 else if(b==0xae){c->on=false;c->dirty=true;}
 else if(b==0xa6||b==0xa7){c->invert=b==0xa7;c->dirty=true;}
 else if(b>=0xb0&&b<=0xb7)c->page=b&7;
}
static void done(void *data,uint8_t *buffer,uint32_t count){
 chip_state_t *c=data;for(unsigned i=0;i<count;i++)byte_in(c,buffer[i]);
 if(!pin_read(c->cs))spi_start(c->spi,&c->rx,1);
}
static void select_changed(void *data,pin_t pin,uint32_t value){
 chip_state_t *c=data;if(value)spi_stop(c->spi);else spi_start(c->spi,&c->rx,1);
}
void chip_init(void){
 chip_state_t *c=calloc(1,sizeof(*c));uint32_t w,h;c->fb=framebuffer_init(&w,&h);c->colEnd=127;c->pageEnd=7;
 c->vcc=pin_init("VCC",INPUT);pin_init("GND",INPUT);c->cs=pin_init("CS",INPUT_PULLUP);c->dc=pin_init("DC",INPUT);
 spi_config_t s={.sck=pin_init("CLK",INPUT),.mosi=pin_init("MOSI",INPUT),.miso=NO_PIN,.mode=0,.done=done,.user_data=c};c->spi=spi_init(&s);
 pin_watch_config_t watch={.edge=BOTH,.pin_change=select_changed,.user_data=c};pin_watch(c->cs,&watch);
 timer_config_t t={.callback=draw,.user_data=c};c->timer=timer_init(&t);c->dirty=true;timer_start(c->timer,50000,true);
}

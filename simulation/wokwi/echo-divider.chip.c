// Wokwi does not solve a general resistor divider. This behavioral helper
// propagates its digital logic level, without claiming an analog voltage test.
// Physical assembly still requires the two resistors shown in diagram.json.
#include "wokwi-api.h"
#include <stdlib.h>
typedef struct {pin_t in,out;} chip_state_t;
static void changed(void *data,pin_t pin,uint32_t value){chip_state_t*c=data;pin_write(c->out,value);}
static unsigned char pixels[180*64*4];
static void box(int x,int y,int w,int h,int r,int g,int b){for(int yy=y;yy<y+h;yy++)for(int xx=x;xx<x+w;xx++){unsigned i=(yy*180+xx)*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=255;}}
void chip_init(void){
 chip_state_t*c=calloc(1,sizeof(*c));c->in=pin_init("IN",INPUT);c->out=pin_init("OUT",OUTPUT_LOW);pin_init("GND",INPUT);
 pin_watch_config_t w={.edge=BOTH,.pin_change=changed,.user_data=c};pin_watch(c->in,&w);
 // Draw the two resistors as a single behavioral circuit block, not extra hardware.
 uint32_t width,height;buffer_t fb=framebuffer_init(&width,&height);box(0,0,180,64,247,241,222);
 box(4,15,172,2,70,80,80);box(103,15,2,35,70,80,80);box(103,49,73,2,70,80,80);
 box(30,7,50,18,210,184,128);box(38,7,5,18,180,35,25);box(49,7,5,18,180,35,25);box(60,7,5,18,180,35,25);box(72,7,3,18,190,145,35);
 box(118,41,42,18,210,184,128);box(123,41,5,18,230,115,25);box(133,41,5,18,230,115,25);box(143,41,5,18,180,35,25);box(154,41,3,18,190,145,35);
 box(169,46,2,10,70,80,80);box(166,56,10,2,70,80,80);box(168,59,6,2,70,80,80);
 buffer_write(fb,0,pixels,sizeof(pixels));
}

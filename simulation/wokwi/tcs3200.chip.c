// Modelo comportamental: filtros e escala de frequencia; nao simula optica.
#include "wokwi-api.h"
#include <stdlib.h>
typedef struct { pin_t s0,s1,s2,s3,out,led,vcc; uint32_t color; timer_t timer; bool level; } chip_state_t;
static void tick(void *data) {
  chip_state_t *c=data;
  unsigned scale=(pin_read(c->s0)<<1)|pin_read(c->s1);
  if(!scale || !pin_read(c->vcc) || !pin_read(c->led)){ pin_write(c->out,LOW); timer_start(c->timer,1000,false);return; }
  unsigned filter=(pin_read(c->s2)<<1)|pin_read(c->s3);
  unsigned color=attr_read(c->color)%5;
  static const unsigned pulses[5][4]={{260,60,100,240},{240,260,100,60},{60,240,100,260},{70,260,100,75},{180,180,100,180}};
  unsigned half=pulses[color][filter];
  // Table at 20% output scaling; 00 power down / 01 2% / 10 20% / 11 100%.
  if(scale==1)half*=10; else if(scale==3)half/=5;
  c->level=!c->level;pin_write(c->out,c->level);
  timer_start(c->timer,half,false);
}
void chip_init(void) {
  chip_state_t *c=calloc(1,sizeof(*c));
  c->vcc=pin_init("VCC",INPUT);pin_init("GND",INPUT);
  c->s0=pin_init("S0",INPUT);c->s1=pin_init("S1",INPUT);c->s2=pin_init("S2",INPUT);c->s3=pin_init("S3",INPUT);
  c->out=pin_init("OUT",OUTPUT_LOW);c->led=pin_init("LED",INPUT);c->color=attr_init("color",0);
  timer_config_t t={.callback=tick,.user_data=c};c->timer=timer_init(&t);timer_start(c->timer,1000,false);
}

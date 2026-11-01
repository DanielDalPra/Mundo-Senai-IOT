#pragma once
#include "../../../firmware/include/config.example.h"
#ifdef HOST_WIFI
#undef TRANSPORT_SERIAL
#define TRANSPORT_SERIAL 0
#endif

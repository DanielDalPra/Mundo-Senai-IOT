#pragma once
struct MFRC522 {
 enum {VersionReg=0x37};
 enum StatusCode { STATUS_OK, STATUS_ERROR, STATUS_COLLISION, STATUS_TIMEOUT };
 byte version=0x92;
 bool card=false,collision=false,selectionFails=false;
 struct {byte size=4;byte uidByte[10]={1,2,3,4};}uid;
 MFRC522(int,int){}
 void PCD_Init(){}
 byte PCD_ReadRegister(int){return version;}
 bool PICC_IsNewCardPresent(){return card;}
 StatusCode PICC_WakeupA(byte*,byte*){return collision?STATUS_COLLISION:card?STATUS_OK:STATUS_TIMEOUT;}
 bool PICC_ReadCardSerial(){return card&&!selectionFails;}
 void PICC_HaltA(){}void PCD_StopCrypto1(){}
};

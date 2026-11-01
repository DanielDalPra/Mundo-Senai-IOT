#pragma once
struct MFRC522 {
 enum {VersionReg=0x37};
 byte version=0x92;
 bool card=false;
 struct {byte size=4;byte uidByte[10]={1,2,3,4};}uid;
 MFRC522(int,int){}
 void PCD_Init(){}
 byte PCD_ReadRegister(int){return version;}
 bool PICC_IsNewCardPresent(){return card;}
 bool PICC_ReadCardSerial(){bool result=card;card=false;return result;}
 void PICC_HaltA(){}void PCD_StopCrypto1(){}
};

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'test/firmware-host/.build');
mkdirSync(output,{recursive:true});
const executable=join(output,process.platform==='win32'?'firmware.exe':'firmware');
const result=spawnSync(process.env.CXX||'g++',['-std=c++11','-Wall','-Wextra','-Itest/firmware-host/stubs','-Ifirmware/include','-Ifirmware/.pio/libdeps/esp32dev/ArduinoJson/src','test/firmware-host/main.cpp','-o',executable],{cwd:root,stdio:'inherit'});
if(result.error)console.error(result.error.message);
if(result.status!==0)process.exit(result.status||1);
for(const name of ['presence','colors','rfid','expired-command','reader-health','ack','timeout','wrong-request','oversized-reply','boot-recovery','command-clock']){
 const result=spawnSync(executable,[name],{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
const integration=spawnSync(process.execPath,['--test','test/firmware-host/integration.test.mjs'],{cwd:root,stdio:'inherit'});
if(integration.status!==0)process.exit(integration.status||1);
const wifi=join(output,process.platform==='win32'?'firmware-wifi.exe':'firmware-wifi');
const compileWifi=spawnSync(process.env.CXX||'g++',['-std=c++11','-Wall','-Wextra','-DHOST_WIFI','-Itest/firmware-host/stubs','-Ifirmware/include','-Ifirmware/.pio/libdeps/esp32dev/ArduinoJson/src','test/firmware-host/main.cpp','-o',wifi],{cwd:root,stdio:'inherit'});
if(compileWifi.status!==0)process.exit(compileWifi.status||1);
const wifiTest=spawnSync(wifi,['wifi'],{cwd:root,stdio:'inherit'});
process.exit(wifiTest.status===0?0:(wifiTest.status||1));

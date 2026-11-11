import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../../server/app.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const binary=join(root,'test/firmware-host/.build',process.platform==='win32'?'firmware.exe':'firmware');
const admin='a'.repeat(64),device='d'.repeat(64);
test('firmware original: 52 amostras fisicas de branco, azul, verde e amarelo da caixa',async t=>{
 const firmware=channel(t,binary,['--protocol']);
 for(const [name,expected] of [
  ['tcs3200-branco-caixa-valido-2026-11-10-1794349193.json','indefinida'],
  ['tcs3200-azul-caixa-2026-11-10-1794349260.json','azul'],
  ['tcs3200-verde-retomada-2026-11-10-1794353109.json','verde'],
  ['tcs3200-amarelo-caixa-2026-11-10-1794353151.json','amarelo'],
 ]){
  const data=JSON.parse(readFileSync(join(root,'docs/calibracao',name),'utf8'));
  assert.equal(data.samples.length,13);
  for(const {r,g,b} of data.samples){
   const actual=JSON.parse(await firmware(JSON.stringify({op:'color',r,g,b})));
   assert.equal(actual.color,expected,`${name}: ${r}/${g}/${b}`);
  }
 }
});
function channel(t,command,args,env={}){
 const child=spawn(command,args,{cwd:root,env:{...process.env,...env}});
 const lines=[],waiters=[];let errorText='';
 createInterface({input:child.stdout}).on('line',line=>{if(waiters.length)waiters.shift().resolve(line);else lines.push(line);});
 child.stderr.on('data',b=>errorText+=b);
 child.on('error',error=>{while(waiters.length)waiters.shift().reject(error);});
 child.on('exit',code=>{while(waiters.length)waiters.shift().reject(Error('Process exited '+code+': '+errorText));});
 t.after(()=>child.kill());
 return async input=>{
  const response=lines.length?Promise.resolve(lines.shift()):new Promise((resolve,reject)=>waiters.push({resolve,reject}));
  child.stdin.write(input+'\n');
  let timer;
  try{return await Promise.race([response,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Protocol timeout: '+errorText)),4000);})]);}
  finally{clearTimeout(timer);}
 };
}
async function fixture(t){
 let time=1000000;
 const dir=mkdtempSync(join(tmpdir(),'senai-original-'));
 const app=makeServer({dataDir:dir,publicDir:join(root,'public'),adminToken:admin,deviceToken:device,now:()=>time});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 t.after(()=>{app.close();app.server.closeAllConnections();rmSync(dir,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+app.server.address().port;
 const firmware=channel(t,binary,['--protocol']);
 const bridge=channel(t,'python',['scripts/usb-bridge.py','--stdio','--url',url],{DEVICE_TOKEN:device});
 const call=async(op,fields={})=>JSON.parse(await firmware(JSON.stringify({op,...fields})));
 async function api(path,body,method=body?'POST':'GET'){const r=await fetch(url+'/api/'+path,{method,headers:{Authorization:'Bearer '+admin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();}
 async function exchange(drop=false){
  const sent=await call('report');
  const line=sent.serial.split('\n').find(l=>l.startsWith('APRENDE_REPORT '));
  assert.ok(line,'Firmware must emit its own report');
  const wire=await bridge(line);assert.ok(wire.startsWith('APRENDE_REPLY '));
  const reply=JSON.parse(wire.slice(14)).reply;
  if(!drop)await call('reply',{line:wire+'\n'});
  return {sent,reply};
 }
 async function visit(){await call('remove');}
 await call('setup');await api('tags',{boxId:'CX-01',uid:'01020304'});await api('tags',{boxId:'CX-02',uid:'11223344'});
 return {call,api,exchange,visit,advance:ms=>time+=ms};
}

test('cor chega ao servidor sem presenca ultrassonica e sem mover estoque',async t=>{
 const {call,api,exchange}=await fixture(t);
 const reading=await call('color',{r:1516,g:919,b:447,present:false});
 assert.equal(reading.color,'azul');assert.equal(reading.present,false);
 await exchange();const state=await api('state');
 assert.equal(state.device.telemetry.color,'azul');
 assert.equal(state.device.telemetry.present,false);
 assert.ok(state.boxes.every(box=>box.slot===null));
});

test('tag próxima identifica caixa no painel e retirada limpa UID ativo sem movimentar estoque',async t=>{
 const {call,api,exchange}=await fixture(t);
 await call('tag',{uid:'01020304'});await exchange();
 let state=await api('state');
 assert.equal(state.device.telemetry.tagUid,'01020304');
 assert.equal(state.boxes.find(b=>b.uid===state.device.telemetry.tagUid).id,'CX-01');
 assert.equal(state.boxes[0].slot,null);
 await exchange();state=await api('state');assert.equal(state.device.telemetry.tagUid,'01020304');
 await call('remove');await exchange();state=await api('state');assert.equal(state.device.telemetry.tagUid,null);
});

test('firmware C++ original + ponte Python + API: entrada, vaga, tag errada e saída',async t=>{
 const {call,api,exchange,visit}=await fixture(t);
 await visit();await exchange();
 await api('command',{action:'entrada',boxId:'CX-01',slot:'A1'});await exchange();
 await call('tag',{uid:'01020304'});assert.equal((await exchange()).reply.result.code,'applied');
 assert.equal((await api('state')).boxes[0].slot,'A1');
 await api('command',{action:'mover',boxId:'CX-01',slot:'B2'});await exchange();await visit();
 await call('tag',{uid:'11223344'});assert.equal((await exchange()).reply.result.code,'wrong_box');
 assert.equal((await api('state')).boxes[0].slot,'A1');
 await visit();await call('tag',{uid:'01020304'});assert.equal((await exchange()).reply.result.code,'applied');
 assert.equal((await api('state')).boxes[0].slot,'B2');
 await api('command',{action:'saida',boxId:'CX-01',slot:null});await exchange();await visit();
 await call('tag',{uid:'01020304'});assert.equal((await exchange()).reply.result.code,'applied');
 assert.equal((await api('state')).boxes[0].slot,null);
 assert.equal((await call('state')).pending,'');
});

test('firmware original: perda do ACK, reenvio e reinício não duplicam movimento',async t=>{
 const {call,api,exchange,visit}=await fixture(t);
 await visit();await api('command',{action:'entrada',boxId:'CX-01',slot:'A1'});await exchange();
 const scan=await call('tag',{uid:'01020304'});assert.ok(scan.pending);
 assert.equal((await exchange(true)).reply.result.code,'applied');
 assert.equal((await call('state')).pending,scan.pending);
 await call('advance',{ms:4001});
 const retry=await exchange();assert.equal(retry.reply.result.duplicate,true);
 assert.equal(JSON.parse(retry.sent.pending).eventId,JSON.parse(scan.pending).eventId);
 assert.equal((await call('state')).stored,'');
 await api('command',{action:'saida',boxId:'CX-01',slot:null});await exchange();await visit();
 const exit=await call('tag',{uid:'01020304'});await exchange(true);
 await call('reboot');await visit();
 const boot=await exchange();assert.equal(boot.reply.result.duplicate,true);
 assert.equal(JSON.parse(boot.sent.pending).eventId,JSON.parse(exit.pending).eventId);
 const state=await api('state');assert.equal(state.boxes[0].slot,null);
 assert.equal(state.history.filter(e=>e.type==='movimento').length,2);
});

test('firmware original: comando cancelado ou expirado não movimenta caixa',async t=>{
 const {call,api,exchange,visit,advance}=await fixture(t);
 await visit();await api('command',{action:'entrada',boxId:'CX-01',slot:'A1'});await exchange();
 await api('command',undefined,'DELETE');await call('tag',{uid:'01020304'});
 assert.equal((await exchange()).reply.result.code,'expired');
 assert.equal((await api('state')).boxes[0].slot,null);
 await visit();await api('command',{action:'entrada',boxId:'CX-01',slot:'A1'});await exchange();
 advance(61000);await call('advance',{ms:61000});await call('tag',{uid:'01020304'});
 assert.equal((await exchange()).reply.result.accepted,false);
 assert.equal((await api('state')).boxes[0].slot,null);
});

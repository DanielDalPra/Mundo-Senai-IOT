import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeServer } from '../server/app.mjs';

const admin = 'a'.repeat(64), device = 'd'.repeat(64);
test('ponte USB usa API real: telemetria, comando, entrada, reenvio e saída', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'senai-usb-'));
  const app = makeServer({dataDir:dir, publicDir:fileURLToPath(new URL('../public',import.meta.url)),adminToken:admin,deviceToken:device});
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const child = spawn('python',['scripts/usb-bridge.py','--stdio','--url',url],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,DEVICE_TOKEN:device}});
  let stdout='', errors='';
  child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>errors+=b);
  t.after(()=>{child.kill();app.close();app.server.closeAllConnections();rmSync(dir,{recursive:true,force:true});});
  let serialRequest=0;
  const telemetry={present:true,distanceCm:3,color:'azul',rssi:0,pulses:[260,240,60],rfidOk:true,oledOk:true};
  async function exchange(scan) {
    const requestId=++serialRequest;
    child.stdin.write('APRENDE_REPORT '+JSON.stringify({requestId,report:{deviceId:'esp32-maquete-01',telemetry,...(scan?{scan}:{})}})+'\n');
    for(let i=0;i<100;i++){
      const line=stdout.split('\n').find(line=>line.startsWith('APRENDE_REPLY ')&&JSON.parse(line.slice(14)).requestId===requestId);
      if(line)return JSON.parse(line.slice(14)).reply;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.fail('Sem confirmação da ponte: '+errors);
  }
  async function post(path,body){const r=await fetch(url+path,{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();}
  child.stdin.write('DIAG leitor inicializando\nAPRENDE_REPORT {invalido}\n');
  assert.equal((await exchange()).ok,true);
  await post('/api/tags',{boxId:'CX-01',uid:'01020304'});
  await post('/api/command',{action:'entrada',boxId:'CX-01',slot:'A1'});
  const command=(await exchange()).command;
  const scan={eventId:'usb-test-event-0001',uid:'01020304',commandId:command.id};
  assert.equal((await exchange(scan)).result.code,'applied');
  assert.equal((await exchange(scan)).result.duplicate,true);
  await post('/api/command',{action:'saida',boxId:'CX-01',slot:null});
  const exit=(await exchange()).command;
  assert.equal((await exchange({...scan,eventId:'usb-test-event-0002',commandId:exit.id})).result.accepted,true);
  const res=await fetch(url+'/api/state',{headers:{Authorization:'Bearer '+admin}});
  const state=await res.json();
  assert.equal(state.boxes[0].slot,null);
  assert.equal(state.device.telemetry.transport,'usb');
  assert.match(errors,/JSONDecodeError/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {hijri,fromHijri,dateInZone} from '../../lib/calendar.ts';
test('Gregorian/Hijri round trip across leap day and year boundaries',()=>{for(const s of ['2024-02-29','2025-03-01','2026-09-06','2000-01-01','2030-12-31']){const d=new Date(s+'T00:00:00Z');const h=hijri(d);assert.equal(fromHijri(h.year,h.month,h.day).toISOString().slice(0,10),s)}});
test('Reject impossible Hijri dates and unsupported range',()=>{assert.throws(()=>fromHijri(1448,1,31));assert.throws(()=>fromHijri(1300,1,1));assert.throws(()=>fromHijri(1448,13,1));for(let m=1;m<=12;m++){const first=fromHijri(1448,m,1);assert.equal(hijri(first).month,m);let found29=false;try{fromHijri(1448,m,30)}catch{found29=true}if(found29)assert.throws(()=>fromHijri(1448,m,30));}});
test('Time zones use their own calendar day across midnight',()=>{const d=new Date('2026-09-06T22:30:00Z');assert.equal(dateInZone(d,'Asia/Riyadh').toISOString().slice(0,10),'2026-09-07');assert.equal(dateInZone(d,'America/New_York').toISOString().slice(0,10),'2026-09-06')});

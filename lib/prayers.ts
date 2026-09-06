export async function getPrayers(params:URLSearchParams){
 const date=params.get('date')||''; const parsed=new Date(date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||parsed.getUTCFullYear()<1900||parsed.getUTCFullYear()>2100)throw Error('Invalid date');
 const method=params.get('method')||'3', school=params.get('school')||'0';
 if(!['1','2','3','4','5','11','13','16'].includes(method)||!['0','1'].includes(school))throw Error('Invalid method');
 const q=new URLSearchParams({method,school});let endpoint='timingsByCity';
 if(params.has('lat')&&params.has('lon')){const lat=Number(params.get('lat')),lon=Number(params.get('lon'));if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid coordinates');q.set('latitude',String(lat));q.set('longitude',String(lon));endpoint='timings'}else{const city=params.get('city')?.trim()||'',country=params.get('country')?.trim()||'';if(!city||!country||city.length>100||country.length>80)throw Error('Invalid location');q.set('city',city);q.set('country',country)}
 const d=date.split('-').reverse().join('-'); const r=await fetch(`https://api.aladhan.com/v1/${endpoint}/${d}?${q}`,{signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Prayer provider unavailable');const j=await r.json();if(j.code!==200||!j.data?.timings||!j.data.meta?.timezone)throw Error('Prayer provider returned invalid data');return j.data;
}

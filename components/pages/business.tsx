'use client';
import {useState} from 'react';
import {Calculator, Copy, RotateCcw} from 'lucide-react';
import {calculateBusiness, evaluateArithmetic, parseBusinessNumber, type BusinessMode} from '@/lib/business';

type Label = readonly [string,string];
const tools: {id:BusinessMode; title:Label; hint:Label; fields:Label[]; result:Label; details:Label[]; sample:string[]}[] = [
 {id:'tax-add',title:['إضافة الضريبة','Add tax'],hint:['المبلغ لا يشمل الضريبة. أضف النسبة التي تختارها.','Start with a tax-exclusive amount and add your chosen rate.'],fields:[['المبلغ قبل الضريبة','Amount before tax'],['نسبة الضريبة %','Tax rate %']],result:['الإجمالي شامل الضريبة','Total including tax'],details:[['المبلغ الأساسي','Base amount'],['قيمة الضريبة','Tax amount']],sample:['100','15']},
 {id:'tax-remove',title:['إزالة الضريبة','Remove tax'],hint:['استخرج المبلغ الأساسي والضريبة من إجمالي شامل لها.','Extract the base and tax from a tax-inclusive total.'],fields:[['المبلغ شامل الضريبة','Tax-inclusive amount'],['نسبة الضريبة %','Tax rate %']],result:['المبلغ بدون الضريبة','Amount excluding tax'],details:[['الضريبة المضمنة','Included tax'],['المبلغ الشامل','Inclusive total']],sample:['115','15']},
 {id:'discount',title:['خصم نسبة','Discount'],hint:['اعرف السعر بعد الخصم والمبلغ الذي وفرته.','See the discounted price and how much you save.'],fields:[['السعر الأصلي','Original price'],['نسبة الخصم %','Discount %']],result:['السعر بعد الخصم','Price after discount'],details:[['قيمة الخصم','Amount saved'],['السعر الأصلي','Original price']],sample:['100','20']},
 {id:'increase',title:['زيادة نسبة','Increase'],hint:['أضف نسبة إلى مبلغ لحساب السعر الجديد أو الزيادة.','Add a percentage to an amount to find the new price.'],fields:[['المبلغ الأصلي','Original amount'],['نسبة الزيادة %','Increase %']],result:['المبلغ بعد الزيادة','Amount after increase'],details:[['قيمة الزيادة','Increase amount'],['المبلغ الأصلي','Original amount']],sample:['100','20']},
 {id:'original',title:['السعر قبل الخصم','Before discount'],hint:['تعرف السعر المخفض؟ استرجع السعر الأصلي باستخدام نسبة الخصم.','Know the sale price? Recover the original using the discount rate.'],fields:[['السعر بعد الخصم','Discounted price'],['نسبة الخصم %','Discount %']],result:['السعر الأصلي قبل الخصم','Original price before discount'],details:[['قيمة الخصم','Discount amount'],['السعر المخفض','Discounted price']],sample:['80','20']},
 {id:'percent',title:['نسبة من مبلغ','Percent of amount'],hint:['احسب قيمة نسبة من مبلغ، مثل العمولة أو الدفعة المقدمة.','Calculate a percentage of an amount, such as a commission or down payment.'],fields:[['المبلغ','Amount'],['النسبة %','Percentage %']],result:['قيمة النسبة','Percentage amount'],details:[['المبلغ','Amount'],['النسبة %','Percentage %']],sample:['100','20']},
 {id:'portion',title:['كم تمثل النسبة؟','What percentage?'],hint:['اعرف كم يمثل مبلغ من إجمالي، مثل عمولة أو دفعة.','Find what percentage a part represents of a total.'],fields:[['الجزء أو المبلغ','Part or amount'],['الإجمالي','Total']],result:['النسبة من الإجمالي','Percentage of total'],details:[['الجزء','Part'],['الإجمالي','Total']],sample:['20','100']},
 {id:'change',title:['نسبة التغير','Percentage change'],hint:['قارن مبلغين لمعرفة نسبة الارتفاع أو الانخفاض.','Compare two values to find the percentage increase or decrease.'],fields:[['المبلغ القديم','Old amount'],['المبلغ الجديد','New amount']],result:['نسبة التغير','Percentage change'],details:[['فرق المبلغ','Amount difference'],['المبلغ الجديد','New amount']],sample:['100','120']},
 {id:'profit',title:['الربح والهامش','Profit & margin'],hint:['أدخل التكلفة الكاملة وسعر البيع دون الضريبة، على الأساس نفسه.','Use full cost and selling price excluding tax, on the same basis.'],fields:[['التكلفة','Cost'],['سعر البيع','Selling price']],result:['الربح / الخسارة','Profit / loss'],details:[['هامش الربح من سعر البيع %','Profit margin on sales %'],['الربح على التكلفة %','Markup on cost %']],sample:['80','100']},
 {id:'invoice',title:['خصم ثم ضريبة','Discount then tax'],hint:['خصم واحد على المبلغ، ثم ضريبة على السعر بعد الخصم.','Apply one discount first, then tax the discounted amount.'],fields:[['المبلغ قبل الخصم والضريبة','Amount before discount and tax'],['نسبة الخصم %','Discount %'],['نسبة الضريبة %','Tax rate %']],result:['الإجمالي النهائي','Final total'],details:[['قيمة الخصم','Discount amount'],['المبلغ بعد الخصم','After discount'],['قيمة الضريبة','Tax amount']],sample:['100','20','15']},
];
export default function BusinessPage({ar}:{ar:boolean}) {
 const t=(label:Label)=>label[ar?0:1];
 const [mode,setMode]=useState<BusinessMode|'calculator'>('tax-add');
 const [values,setValues]=useState<Record<string,string[]>>({});
 const [precision,setPrecision]=useState('2');
 const [copied,setCopied]=useState('');
 const [expression,setExpression]=useState('');
 const config=tools.find(item=>item.id===mode)??tools[0];
 const fields=values[mode]??config.fields.map(()=> '');
 const numbers=fields.map(parseBusinessNumber);
 const complete=numbers.every(n=>n!==null);
 const result=complete?calculateBusiness(config.id,numbers[0]!,numbers[1]!,numbers[2]??0):null;
 const arithmetic=evaluateArithmetic(expression);
 const value=mode==='calculator'?arithmetic:result?.value;
 const format=(n:number)=>new Intl.NumberFormat(ar?'ar-SA-u-nu-latn':'en-GB',{minimumFractionDigits:Number(precision),maximumFractionDigits:Number(precision)}).format(Object.is(n,-0)?0:n);
 const percent=mode==='portion'||mode==='change';
 const setField=(index:number,value:string)=>{setValues(prev=>({...prev,[mode]:fields.map((v,i)=>i===index?value:v)}));setCopied('');};
 async function copy(){if(value==null)return;try{const details=mode==='calculator'?expression:config.fields.map((label,i)=>`${t(label)}: ${fields[i]}`).join('\n');await navigator.clipboard.writeText(`${mode==='calculator'?t(['آلة حاسبة','Calculator']):t(config.title)}\n${details}\n${t(['النتيجة','Result'])}: ${format(value)}${percent?'%':''}`);setCopied(t(['تم النسخ','Copied']));}catch{setCopied(t(['تعذر النسخ؛ يمكنك تحديد النتيجة ونسخها.','Could not copy. Select the result to copy it.']));}}
 return <div className="business">
  <label className="business-mobile-tools" htmlFor="business-tool">{t(['اختر نوع الحساب','Choose calculation'])}<select id="business-tool" className="pick" value={mode} onChange={e=>{setMode(e.target.value as BusinessMode|'calculator');setCopied('');}}>{tools.map(tool=><option key={tool.id} value={tool.id}>{t(tool.title)}</option>)}<option value="calculator">{t(['آلة حاسبة','Calculator'])}</option></select></label>
  <nav className="business-tools" aria-label={t(['اختر الحاسبة','Choose a calculator'])}>
   {tools.map(tool=><button key={tool.id} type="button" aria-pressed={mode===tool.id} onClick={()=>{setMode(tool.id);setCopied('');}}>{t(tool.title)}</button>)}
   <button type="button" aria-pressed={mode==='calculator'} onClick={()=>{setMode('calculator');setCopied('');}}><Calculator size={16}/>{t(['آلة حاسبة','Calculator'])}</button>
  </nav>
  <section className="panel business-workspace" aria-label={mode==='calculator'?t(['آلة حاسبة','Calculator']):t(config.title)}>
   <div className="business-inputs">
    <h2>{mode==='calculator'?t(['آلة حاسبة مستقلة','Everyday calculator']):t(config.title)}</h2>
    <p className="sub">{mode==='calculator'?t(['جمع وطرح وضرب وقسمة مع الأقواس وأولوية العمليات.','Add, subtract, multiply and divide with parentheses and operator precedence.']):t(config.hint)}</p>
    {mode==='calculator'?<>
     <label className="field" htmlFor="business-expression">{t(['العملية الحسابية','Expression'])}<input id="business-expression" dir="ltr" type="text" inputMode="text" maxLength={200} placeholder="(100 + 20) × 2" value={expression} onChange={e=>{setExpression(e.target.value);setCopied('');}} autoComplete="off" spellCheck={false}/></label>
     <div className="business-keypad">{['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','(',')','+','⌫'].map(key=><button type="button" key={key} aria-label={key==='⌫'?t(['حذف آخر رمز','Backspace']):key} onClick={()=>{setExpression(old=>key==='⌫'?old.slice(0,-1):(old+key).slice(0,200));setCopied('');}}>{key}</button>)}</div>
    </>:<div className="business-fields">{config.fields.map((label,i)=><div className="field" key={`${mode}-${i}`}><label htmlFor={`business-${i}`}><span className="business-variable">{'ABC'[i]}</span>{t(label)}</label><input id={`business-${i}`} dir="ltr" type="text" inputMode="decimal" maxLength={24} value={fields[i]} placeholder={config.sample[i]} onChange={e=>setField(i,e.target.value)} aria-invalid={fields[i]!==''&&numbers[i]===null} aria-describedby="business-help" autoComplete="off"/>{label[1].includes('%')&&<div className="business-presets">{[0,5,10,15,20].map(rate=><button type="button" key={rate} onClick={()=>setField(i,String(rate))}>{rate}%</button>)}</div>}</div>)}</div>}
    <div className="business-actions">
     <button type="button" className="btn secondary" onClick={()=>{if(mode==='calculator')setExpression('(100 + 20) × 2');else setValues(prev=>({...prev,[mode]:config.sample}));setCopied('');}}>{t(['جرّب مثالاً','Try an example'])}</button>
     <button type="button" className="business-reset" onClick={()=>{if(mode==='calculator')setExpression('');else setValues(prev=>({...prev,[mode]:config.fields.map(()=> '')}));setCopied('');}}><RotateCcw size={16}/>{t(['مسح','Clear'])}</button>
    </div>
    <p id="business-help" className="sub">{t(['تُقبل الأرقام العربية والإنجليزية. استخدم النقطة أو ٫ للكسور.','Arabic and English digits accepted. Use a dot or ٫ for decimals.'])}</p>
   </div>
   <div className="business-output">
    <div className="business-output-heading"><span>{t(['نتيجة فورية','LIVE RESULT'])}</span><label>{t(['المنازل العشرية','Decimals'])}<select value={precision} onChange={e=>{setPrecision(e.target.value);setCopied('');}}>{[0,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
    <div aria-live="polite" aria-atomic="true">
     <p>{mode==='calculator'?t(['الناتج','Result']):t(config.result)}</p>
     <output className="business-total" dir="ltr">{value==null?'—':`${format(value)}${percent?'%':''}`}</output>
     {mode!=='calculator'&&result&&<dl className="business-breakdown">{result.details.map((n,i)=><div key={i}><dt>{t(config.details[i])}</dt><dd dir="ltr">{format(n)}{mode==='profit'||(mode==='percent'&&i===1)?'%':''}</dd></div>)}</dl>}
     {value==null&&<p className={mode==='calculator'?expression?'error':'sub':fields.every(v=>v!=='')?'error':'sub'}>{mode==='calculator'?expression?t(['أكمل العملية وتحقق من الأقواس؛ لا يمكن القسمة على صفر.','Complete the expression and check parentheses; division by zero is undefined.']):t(['اكتب العملية أو استخدم الأزرار.','Type an expression or use the keypad.']):fields.every(v=>v!=='')?t(['تحقق من الأرقام: الخصم من 0 إلى 100٪، واسترجاع السعر يتطلب خصماً أقل من 100٪. الإجمالي أو أساس النسبة لا يكون صفراً. الحد للمبالغ والنتائج تريليون.','Check the numbers: discounts are 0–100%; recovering the original requires less than 100%. A percentage base cannot be zero. Amounts and results are limited to one trillion.']):t(['أدخل القيم لتظهر النتيجة هنا، أو جرّب المثال.','Enter values to see the result, or try the example.'])}</p>}
    </div>
    {result&&mode!=='calculator'&&<div className="business-formula"><span>{t(['طريقة الحساب','Formula'])}</span><code dir="ltr">{result.formula}</code></div>}
    <button className="btn" type="button" disabled={value==null} onClick={copy}><Copy size={16}/>{t(['نسخ العملية والنتيجة','Copy calculation'])}</button>
    <span className="sub" role="status">{copied}</span>
    <p className="sub">{t(['الحساب محلي على جهازك. التقريب للعرض فقط، والمبالغ كلها بالعملة نفسها.','Calculated on your device. Rounding is for display only; use the same currency throughout.'])}</p>
   </div>
  </section>
  <section className="section article business-guide">
   <h2>{t(['إجابات سريعة لحساباتك اليومية','Quick answers for everyday calculations'])}</h2>
   <details open><summary>{t(['كيف أضيف ضريبة 15٪ أو أزيلها؟','How do I add or remove 15% tax?'])}</summary><p>{t(['100 مع ضريبة 15٪ يصبح 115. لإزالة الضريبة من 115 نقسم على 1.15 فيكون الأصل 100 والضريبة 15. طرح 15٪ من الإجمالي ليس إزالة صحيحة للضريبة. النسبة التي تدخلها أنت هي المستخدمة، ولا يحدد الموقع نسبة بلدك.','100 plus 15% tax is 115. To remove tax from 115, divide by 1.15: the base is 100 and tax is 15. Subtracting 15% from the total does not remove the included tax correctly. You supply the rate; the site does not determine your country’s tax rate.'])}</p></details>
   <details><summary>{t(['كم يصبح 100 بعد خصم أو زيادة 20٪؟','What is 100 after a 20% discount or increase?'])}</summary><p>{t(['بعد الخصم: 80. بعد الزيادة: 120. إذا كان 80 هو السعر بعد خصم 20٪ فالسعر الأصلي 100. نسبة الخصم ونسبة الزيادة ليستا عمليتين عكسيتين؛ زيادة 80 بنسبة 20٪ تعطي 96.','After a discount: 80. After an increase: 120. If 80 is the price after a 20% discount, the original is 100. An equal percentage increase does not undo a discount: increasing 80 by 20% gives 96.'])}</p></details>
   <details><summary>{t(['ما الفرق بين هامش الربح والربح على التكلفة؟','How do profit margin and markup differ?'])}</summary><p>{t(['تكلفة 80 وبيع 100 تعني ربحاً 20. هامش الربح هو 20٪ من سعر البيع، بينما الربح على التكلفة هو 25٪. إذا أدخلت تكلفة الشراء فقط فالنتيجة لا تشمل مصاريفك الأخرى. القيم السالبة تعني خسارة.','A cost of 80 and sale of 100 gives a profit of 20. The margin is 20% of sales, while markup is 25% of cost. If you enter only the purchase cost, other expenses are not included. Negative results indicate a loss.'])}</p></details>
   <details><summary>{t(['كيف أحسب خصماً ثم ضريبة؟','How do I calculate a discount followed by tax?'])}</summary><p>{t(['مبلغ 100 مع خصم 20٪ يصبح 80، ثم ضريبة 15٪ بقيمة 12، والإجمالي 92. هذه أداة حساب لمبلغ واحد؛ لا تطبق قواعد فواتير خاصة أو تقريب كل بند، لذلك قد تختلف عن إجمالي نظام الفوترة لديك.','100 discounted by 20% becomes 80. Adding 15% tax gives tax of 12 and a total of 92. This is a single-amount calculator; it does not apply special invoice rules or per-line rounding, so your billing system’s total may differ.'])}</p></details>
  </section>
 </div>;
}

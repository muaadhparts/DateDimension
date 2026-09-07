'use client';

/** A plain <select> styled by the .pick rule in globals.css. */
export default function SelectField({value,onChange,items,label}:{value:string;onChange:(s:string)=>void;items:[string,string][];label:string}){return <select className="pick" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{items.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select>}

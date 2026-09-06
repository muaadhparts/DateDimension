import type {Metadata} from 'next';
import './globals.css';
import {headers} from 'next/headers';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},applicationName:'Your Day Now'};
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{lang?:string}>}){const lang=(await headers()).get('x-date-language');return <html lang={lang==='en'?'en':'ar'} dir={lang==='en'?'ltr':'rtl'}><body>{children}</body></html>}

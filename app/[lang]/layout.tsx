import type {Metadata} from 'next';
import '../globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},applicationName:'Your Day Now'};
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{lang:string}>}){const {lang}=await params;const en=lang==='en';return <html lang={en?'en':'ar'} dir={en?'ltr':'rtl'}><body>{children}</body></html>}

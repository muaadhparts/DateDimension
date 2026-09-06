import type {MetadataRoute} from 'next';
import {cities,routes} from '@/lib/calendar';
import {SITE_URL} from '@/lib/site';
export default function sitemap():MetadataRoute.Sitemap{return ['ar','en'].flatMap(lang=>[...routes,...cities.map(c=>'prayer-times/'+c.slug)].map(path=>({url:`${SITE_URL}/${lang}${path?'/'+path:''}`})))}

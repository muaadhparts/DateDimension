import type {MetadataRoute} from 'next';
import {SITE_URL,INDEXABLE} from '@/lib/site';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',allow:INDEXABLE?'/':undefined,disallow:INDEXABLE?['/api/']:'/'},sitemap:SITE_URL+'/sitemap.xml'}}

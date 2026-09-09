import Link from 'next/link';
import type {ComponentProps} from 'react';

/** Keep locale changes as document navigations so html lang/dir also change. */
export default function AppLink(props: ComponentProps<'a'>) {
  if (props.href && /^\/(ar|en)(?:\/|$)/.test(props.href) && !props.hrefLang) {
    return <Link {...props} href={props.href} prefetch={false} />;
  }
  return <a {...props} />;
}

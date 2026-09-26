import Link from 'next/link';
import type {ComponentProps} from 'react';

// Pages served with their own Content-Security-Policy (the national address
// map loads Google's scripts). A client-side navigation would keep the policy
// of the page the visitor came from, so these must be real document loads.
const OWN_POLICY = /^\/(ar|en)\/national-address(?:[?#]|$)/;

/** Keep locale changes as document navigations so html lang/dir also change. */
export default function AppLink(props: ComponentProps<'a'>) {
  if (
    props.href &&
    /^\/(ar|en)(?:\/|$)/.test(props.href) &&
    !props.hrefLang &&
    !OWN_POLICY.test(props.href)
  ) {
    return <Link {...props} href={props.href} prefetch={false} />;
  }
  return <a {...props} />;
}

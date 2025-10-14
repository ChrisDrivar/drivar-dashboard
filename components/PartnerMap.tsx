'use client';

import dynamic from 'next/dynamic';
import type { PartnerMapProps } from './PartnerMapLeaflet';

const LeafletMap = dynamic(() => import('./PartnerMapLeaflet'), { ssr: false });

export function PartnerMap(props: PartnerMapProps) {
  return <LeafletMap {...props} />;
}

export const LEAD_STATUS_VALUES = [
  'Angefragt',
  'In Verhandlung',
  'Vertrag unterschrieben',
  'Abgelehnt',
] as const;

export type LeadStatus = (typeof LEAD_STATUS_VALUES)[number];

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  Angefragt: 'yellow',
  'In Verhandlung': 'orange',
  'Vertrag unterschrieben': 'green',
  Abgelehnt: 'red',
};


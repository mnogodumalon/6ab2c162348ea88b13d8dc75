// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Ladeprotokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    lampenname?: string;
    lampentyp?: LookupValue;
    standort?: string;
    notizen?: string;
    letztes_aufladen?: string; // Format: YYYY-MM-DD oder ISO String
    akkustand?: LookupValue;
    naechstes_laden?: string; // Format: YYYY-MM-DD oder ISO String
    laden_vollstaendig?: boolean;
  };
}

export const APP_IDS = {
  LADEPROTOKOLL: '6ab2c158c583c2477590e86c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'ladeprotokoll': {
    lampentyp: [{ key: "taschenlampe", label: "Taschenlampe" }, { key: "stirnlampe", label: "Stirnlampe" }, { key: "campinglampe", label: "Campinglampe" }, { key: "gartenlampe", label: "Gartenlampe" }, { key: "arbeitsleuchte", label: "Arbeitsleuchte" }, { key: "sonstige", label: "Sonstige" }],
    akkustand: [{ key: "voll", label: "Voll geladen (100 %)" }, { key: "teilweise", label: "Teilweise geladen (50–99 %)" }, { key: "niedrig", label: "Niedrig geladen (unter 50 %)" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'ladeprotokoll': {
    'lampenname': 'string/text',
    'lampentyp': 'lookup/select',
    'standort': 'string/text',
    'notizen': 'string/textarea',
    'letztes_aufladen': 'date/datetimeminute',
    'akkustand': 'lookup/radio',
    'naechstes_laden': 'date/date',
    'laden_vollstaendig': 'bool',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateLadeprotokoll = StripLookup<Ladeprotokoll['fields']>;
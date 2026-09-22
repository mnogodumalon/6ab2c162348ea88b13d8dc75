import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6ab2c158c583c2477590e86c';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormLadeprotokoll() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Ladeprotokoll — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="lampenname">Name der Lampe</Label>
            <Input
              id="lampenname"
              value={fields.lampenname ?? ''}
              onChange={e => setFields(f => ({ ...f, lampenname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lampentyp">Lampentyp</Label>
            <Select
              value={lookupKey(fields.lampentyp) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lampentyp: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lampentyp"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="taschenlampe">Taschenlampe</SelectItem>
                <SelectItem value="stirnlampe">Stirnlampe</SelectItem>
                <SelectItem value="campinglampe">Campinglampe</SelectItem>
                <SelectItem value="gartenlampe">Gartenlampe</SelectItem>
                <SelectItem value="arbeitsleuchte">Arbeitsleuchte</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort / Aufbewahrungsort</Label>
            <Input
              id="standort"
              value={fields.standort ?? ''}
              onChange={e => setFields(f => ({ ...f, standort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen zur Lampe</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="letztes_aufladen">Zuletzt aufgeladen am</Label>
            <Input
              id="letztes_aufladen"
              type="datetime-local"
              step="60"
              value={fields.letztes_aufladen ?? ''}
              onChange={e => setFields(f => ({ ...f, letztes_aufladen: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="akkustand">Akkustand nach dem Laden</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.akkustand) === 'voll'}
                onClick={() => setFields(f => ({ ...f, akkustand: (lookupKey(f.akkustand) === 'voll' ? undefined : 'voll') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.akkustand) === 'voll'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Voll geladen (100 %)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.akkustand) === 'teilweise'}
                onClick={() => setFields(f => ({ ...f, akkustand: (lookupKey(f.akkustand) === 'teilweise' ? undefined : 'teilweise') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.akkustand) === 'teilweise'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Teilweise geladen (50–99 %)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.akkustand) === 'niedrig'}
                onClick={() => setFields(f => ({ ...f, akkustand: (lookupKey(f.akkustand) === 'niedrig' ? undefined : 'niedrig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.akkustand) === 'niedrig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Niedrig geladen (unter 50 %)
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechstes_laden">Nächstes geplantes Aufladen</Label>
            <Input
              id="naechstes_laden"
              type="date"
              value={fields.naechstes_laden ?? ''}
              onChange={e => setFields(f => ({ ...f, naechstes_laden: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="laden_vollstaendig">Ladevorgang vollständig abgeschlossen</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="laden_vollstaendig"
                checked={!!fields.laden_vollstaendig}
                onCheckedChange={(v) => setFields(f => ({ ...f, laden_vollstaendig: !!v }))}
              />
              <Label htmlFor="laden_vollstaendig" className="font-normal">Ladevorgang vollständig abgeschlossen</Label>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}

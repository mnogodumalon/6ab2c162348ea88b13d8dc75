import type { Ladeprotokoll } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface LadeprotokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Ladeprotokoll | null;
  onEdit: (record: Ladeprotokoll) => void;
}

export function LadeprotokollViewDialog({ open, onClose, record, onEdit }: LadeprotokollViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ladeprotokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Lampe</Label>
            <p className="text-sm">{record.fields.lampenname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lampentyp</Label>
            <Badge variant="secondary">{record.fields.lampentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Standort / Aufbewahrungsort</Label>
            <p className="text-sm">{record.fields.standort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zur Lampe</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zuletzt aufgeladen am</Label>
            <p className="text-sm">{formatDate(record.fields.letztes_aufladen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Akkustand nach dem Laden</Label>
            <Badge variant="secondary">{record.fields.akkustand?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächstes geplantes Aufladen</Label>
            <p className="text-sm">{formatDate(record.fields.naechstes_laden)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ladevorgang vollständig abgeschlossen</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.laden_vollstaendig ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.laden_vollstaendig ? 'Ja' : 'Nein'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Ladeprotokoll } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LadeprotokollDialog } from '@/components/dialogs/LadeprotokollDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconBolt, IconBoltOff,
  IconFlame, IconCalendar, IconMapPin, IconBattery,
  IconBatteryCharging, IconBattery2, IconBatteryAutomotive,
} from '@tabler/icons-react';

const APPGROUP_ID = '6ab2c162348ea88b13d8dc75';
const REPAIR_ENDPOINT = '/claude/build/repair';

// Determines urgency level based on next charging date and battery status
function getUrgency(record: Ladeprotokoll): 'overdue' | 'soon' | 'ok' | 'unknown' {
  const akkuKey = record.fields.akkustand?.key;
  if (akkuKey === 'niedrig') return 'overdue';

  const nextLaden = record.fields.naechstes_laden;
  if (!nextLaden) return 'unknown';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(nextLaden);
  nextDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'ok';
}

function BatteryIcon({ akkuKey, size = 18 }: { akkuKey?: string; size?: number }) {
  if (akkuKey === 'voll') return <IconBatteryAutomotive size={size} className="text-green-500 shrink-0" />;
  if (akkuKey === 'teilweise') return <IconBattery2 size={size} className="text-amber-500 shrink-0" />;
  if (akkuKey === 'niedrig') return <IconBoltOff size={size} className="text-red-500 shrink-0" />;
  return <IconBattery size={size} className="text-muted-foreground shrink-0" />;
}

function UrgencyBadge({ urgency }: { urgency: ReturnType<typeof getUrgency> }) {
  if (urgency === 'overdue') return <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0">Überfällig</Badge>;
  if (urgency === 'soon') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">Bald fällig</Badge>;
  if (urgency === 'ok') return <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">OK</Badge>;
  return <Badge variant="secondary" className="shrink-0">Unbekannt</Badge>;
}

export default function DashboardOverview() {
  const { ladeprotokoll, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Ladeprotokoll | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ladeprotokoll | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'soon' | 'ok'>('all');

  const enriched = useMemo(() => {
    return ladeprotokoll.map(r => ({ record: r, urgency: getUrgency(r) }));
  }, [ladeprotokoll]);

  const stats = useMemo(() => {
    const total = ladeprotokoll.length;
    const overdue = enriched.filter(e => e.urgency === 'overdue').length;
    const soon = enriched.filter(e => e.urgency === 'soon').length;
    const ok = enriched.filter(e => e.urgency === 'ok').length;
    const vollGeladen = ladeprotokoll.filter(r => r.fields.akkustand?.key === 'voll').length;
    return { total, overdue, soon, ok, vollGeladen };
  }, [ladeprotokoll, enriched]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return enriched;
    return enriched.filter(e => e.urgency === filterStatus);
  }, [enriched, filterStatus]);

  const sortedFiltered = useMemo(() => {
    const order: Record<string, number> = { overdue: 0, soon: 1, unknown: 2, ok: 3 };
    return [...filtered].sort((a, b) => (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2));
  }, [filtered]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  async function handleCreate(fields: Ladeprotokoll['fields']) {
    await LivingAppsService.createLadeprotokollEntry(fields);
    fetchAll();
  }

  async function handleUpdate(fields: Ladeprotokoll['fields']) {
    if (!editRecord) return;
    await LivingAppsService.updateLadeprotokollEntry(editRecord.record_id, fields);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteLadeprotokollEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Akkuleuchten</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ladeprotokoll & Akkustatus aller Lampen</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Lampe hinzufügen
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Lampen erfasst"
          icon={<IconBatteryCharging size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(stats.overdue)}
          description="Sofort laden"
          icon={<IconFlame size={18} className="text-red-500" />}
        />
        <StatCard
          title="Bald fällig"
          value={String(stats.soon)}
          description="In den nächsten 3 Tagen"
          icon={<IconBolt size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Voll geladen"
          value={String(stats.vollGeladen)}
          description="Bereit für Einsatz"
          icon={<IconBatteryAutomotive size={18} className="text-green-500" />}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `Alle (${stats.total})` },
          { key: 'overdue', label: `Überfällig (${stats.overdue})` },
          { key: 'soon', label: `Bald fällig (${stats.soon})` },
          { key: 'ok', label: `OK (${stats.ok})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key as typeof filterStatus)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lamp cards grid */}
      {sortedFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-dashed bg-muted/20">
          <IconBatteryCharging size={48} stroke={1.5} className="text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-foreground">Keine Lampen vorhanden</p>
            <p className="text-sm text-muted-foreground mt-1">Füge deine erste Lampe hinzu, um den Akku-Status zu tracken.</p>
          </div>
          <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
            <IconPlus size={16} className="mr-2" />Lampe hinzufügen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFiltered.map(({ record, urgency }) => {
            const f = record.fields;
            const akkuKey = f.akkustand?.key;
            const urgencyBorder =
              urgency === 'overdue' ? 'border-red-200 bg-red-50/40' :
              urgency === 'soon' ? 'border-amber-200 bg-amber-50/30' :
              'border-border bg-card';

            return (
              <div
                key={record.record_id}
                className={`rounded-2xl border overflow-hidden shadow-sm flex flex-col ${urgencyBorder}`}
              >
                {/* Card header */}
                <div className="p-4 pb-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <BatteryIcon akkuKey={akkuKey} size={20} />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate leading-tight">
                        {f.lampenname ?? 'Unbenannte Lampe'}
                      </p>
                      {f.lampentyp?.label && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.lampentyp.label}</p>
                      )}
                    </div>
                  </div>
                  <UrgencyBadge urgency={urgency} />
                </div>

                {/* Card body */}
                <div className="px-4 pb-3 space-y-2 flex-1">
                  {f.akkustand?.label && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconBattery size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">Akkustand:</span>
                      <span className="font-medium truncate">{f.akkustand.label}</span>
                    </div>
                  )}
                  {f.standort && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconMapPin size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">Standort:</span>
                      <span className="truncate">{f.standort}</span>
                    </div>
                  )}
                  {f.letztes_aufladen && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconBolt size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">Zuletzt:</span>
                      <span className="truncate">{formatDate(f.letztes_aufladen)}</span>
                    </div>
                  )}
                  {f.naechstes_laden && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">Nächstes Laden:</span>
                      <span className={`truncate font-medium ${urgency === 'overdue' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : ''}`}>
                        {formatDate(f.naechstes_laden)}
                      </span>
                    </div>
                  )}
                  {f.laden_vollstaendig !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconCheck size={14} className={f.laden_vollstaendig ? 'text-green-500 shrink-0' : 'text-muted-foreground shrink-0'} />
                      <span className="text-muted-foreground">Ladevorgang abgeschlossen:</span>
                      <span className={`font-medium ${f.laden_vollstaendig ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {f.laden_vollstaendig ? 'Ja' : 'Nein'}
                      </span>
                    </div>
                  )}
                  {f.notizen && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 border-t border-border/50 pt-2">{f.notizen}</p>
                  )}
                </div>

                {/* Card actions */}
                <div className="px-4 py-3 border-t border-border/50 flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditRecord(record); setDialogOpen(true); }}
                  >
                    <IconPencil size={14} className="mr-1 shrink-0" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setDeleteTarget(record)}
                  >
                    <IconTrash size={14} className="mr-1 shrink-0" />
                    Löschen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <LadeprotokollDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await handleUpdate(fields as Ladeprotokoll['fields']);
          } else {
            await handleCreate(fields as Ladeprotokoll['fields']);
          }
          setDialogOpen(false);
          setEditRecord(null);
        }}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Ladeprotokoll']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ladeprotokoll']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Lampe löschen"
        description={`Soll "${deleteTarget?.fields.lampenname ?? 'diese Lampe'}" wirklich aus dem Ladeprotokoll gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}

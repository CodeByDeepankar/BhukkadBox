'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock4, Package, TriangleAlert } from 'lucide-react';
import { limitToLast, onValue, query, ref } from 'firebase/database';

import { realtimeDb } from '@/lib/firebaseConfig';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface MachineLogEntry {
  type?: string;
  payment_id?: string;
  amount?: number;
  quantity?: number;
  timestamp?: number;
  message?: string;
  reason?: string;
}

interface StatusProps {
  quantity: number;
  paymentId?: string;
  onBackToDashboard: () => void;
}

export function Status({ quantity, paymentId, onBackToDashboard }: StatusProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('pending');
  const [dispenseFlag, setDispenseFlag] = useState(false);
  const [lastDispensedAt, setLastDispensedAt] = useState<number | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(paymentId ?? null);
  const [logs, setLogs] = useState<MachineLogEntry[]>([]);

  useEffect(() => {
    const machinePath = 'vending/machine1';
    const machineRef = ref(realtimeDb, machinePath);
    const logsRef = query(ref(realtimeDb, `${machinePath}/logs`), limitToLast(20));

    const unsubscribeMachine = onValue(
      machineRef,
      (snapshot) => {
        setIsLoading(false);
        const data = snapshot.val() as
          | { status?: string; dispense?: unknown; payment_id?: unknown; last_dispensed?: unknown }
          | null;

        if (!data) {
          setStatus('unavailable');
          return;
        }

        if (typeof data.status === 'string') {
          setStatus(data.status);
        }

        setDispenseFlag(Boolean(data.dispense));

        if (typeof data.payment_id === 'string' && data.payment_id.trim().length > 0) {
          setActivePaymentId(data.payment_id);
        }

        if (typeof data.last_dispensed === 'number') {
          setLastDispensedAt(data.last_dispensed);
        }
      },
      () => setIsLoading(false),
    );

    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        setLogs([]);
        return;
      }

      const entries = Object.values(value) as MachineLogEntry[];
      entries.sort((a, b) => {
        const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
        const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
        return bTime - aTime;
      });
      setLogs(entries);
    });

    return () => {
      unsubscribeMachine();
      unsubscribeLogs();
    };
  }, [paymentId]);

  const statusInfo = useMemo(() => {
    const statusLabel = status ?? 'unknown';
    switch (statusLabel) {
      case 'payment_created':
        return {
          label: 'Payment initiated',
          description: 'We notified the dispenser about your payment.',
          variant: 'secondary' as const,
          Icon: Package,
        };
      case 'payment_success':
        return {
          label: 'Payment confirmed',
          description: 'Vending machine received the payment successfully.',
          variant: 'secondary' as const,
          Icon: Package,
        };
      case 'dispensing':
        return {
          label: 'Dispensing in progress',
          description: 'The dispenser is preparing your chips right now.',
          variant: 'default' as const,
          Icon: CheckCircle2,
        };
      case 'dispensed':
      case 'completed':
      case 'done':
        return {
          label: 'Dispensed Successfully',
          description: 'Collect your chips from the tray. Thanks for the purchase!',
          variant: 'default' as const,
          Icon: CheckCircle2,
        };
      case 'payment_failed':
        return {
          label: 'Payment failed',
          description: 'Payment failed. Please retry the transaction.',
          variant: 'destructive' as const,
          Icon: TriangleAlert,
        };
      case 'error':
        return {
          label: 'Machine error',
          description: 'The machine reported a fault. Contact support if this persists.',
          variant: 'destructive' as const,
          Icon: TriangleAlert,
        };
      case 'unavailable':
        return {
          label: 'Machine offline',
          description: 'No data received from the vending machine.',
          variant: 'outline' as const,
          Icon: TriangleAlert,
        };
      default:
        return {
          label: 'Awaiting update',
          description: 'Listening for the latest status from the vending machine.',
          variant: 'outline' as const,
          Icon: Clock4,
        };
    }
  }, [status]);

  const formatTimestamp = (timestamp?: number) => {
    if (typeof timestamp !== 'number') {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(timestamp));
    } catch {
      return '—';
    }
  };

  const recentLogs = logs.slice(0, 6);
  const { Icon, label, description, variant } = statusInfo;
  const displayPaymentId = activePaymentId ?? paymentId ?? '—';
  const isComplete = status === 'dispensed' || status === 'completed' || status === 'done';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Vending status</CardTitle>
              <CardDescription>
                Monitoring machine response for your order of {quantity} packet
                {quantity > 1 ? 's' : ''}.
              </CardDescription>
            </div>
            <Badge variant={variant}>{label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Icon className="h-4 w-4" />
            <span>{description}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs uppercase text-gray-500">Payment id</p>
              <p className="mt-1 font-medium break-all">{displayPaymentId}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs uppercase text-gray-500">Last dispensed</p>
              <p className="mt-1 font-medium">{formatTimestamp(lastDispensedAt ?? undefined)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs uppercase text-gray-500">Dispense flag</p>
              <p className="mt-1 font-medium">{dispenseFlag ? 'Active' : 'Idle'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-500">Recent logs</h3>
              <span className="text-xs text-gray-500">
                {isLoading ? 'Listening…' : `${recentLogs.length} item${recentLogs.length === 1 ? '' : 's'}`}
              </span>
            </div>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                No log entries yet. The dispenser will post updates here in real time.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentLogs.map((log, index) => (
                  <li key={`${log.timestamp ?? index}-${log.type ?? 'log'}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{log.type ?? 'event'}</span>
                      <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      {log.message ? <p>{log.message}</p> : null}
                      {log.reason ? <p>Reason: {log.reason}</p> : null}
                      {log.payment_id ? <p>Payment: {log.payment_id}</p> : null}
                      {typeof log.amount === 'number' ? <p>Amount: ₹{log.amount}</p> : null}
                      {typeof log.quantity === 'number' ? <p>Quantity: {log.quantity}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={onBackToDashboard} variant={isComplete ? 'default' : 'outline'}>
            Back to dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

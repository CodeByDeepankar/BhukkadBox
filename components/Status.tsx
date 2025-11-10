'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { CheckCircle2, CreditCard, Package, Truck } from 'lucide-react';
import { onValue, ref } from 'firebase/database';

import { realtimeDb } from '@/lib/firebaseConfig';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';

interface StatusProps {
  quantity: number;
  paymentId?: string;
  onBackToDashboard: () => void;
}

type StepState = 'pending' | 'active' | 'complete';

interface StepConfig {
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
}

const STEP_CONFIG: StepConfig[] = [
  {
    label: 'Payment Confirmed',
    description: 'Razorpay verified your payment successfully.',
    Icon: CreditCard,
  },
  {
    label: 'Preparing Order',
    description: 'Aligning the next available row before dispensing.',
    Icon: Package,
  },
  {
    label: 'Dispensing Chips',
    description: 'Servo motor is rotating to drop your chips.',
    Icon: Truck,
  },
  {
    label: 'Dispensed Successfully',
    description: 'Collect your chips from the tray. Thanks for the purchase!',
    Icon: CheckCircle2,
  },
];

const COMPLETED_STATUSES = new Set(['dispensed', 'completed', 'done']);
const FAILURE_STATUSES = new Set(['payment_failed', 'out_of_stock', 'error']);

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function fallbackProgress({
  status,
  hasAssignedRows,
  dispenseFlag,
}: {
  status: string;
  hasAssignedRows: boolean;
  dispenseFlag: boolean;
}) {
  if (COMPLETED_STATUSES.has(status)) {
    return 100;
  }
  if (status === 'dispensing') {
    return 85;
  }
  if (hasAssignedRows || dispenseFlag) {
    return 65;
  }
  if (status === 'payment_success') {
    return 40;
  }
  if (status === 'payment_created') {
    return 20;
  }
  if (FAILURE_STATUSES.has(status)) {
    return 0;
  }
  return 10;
}

function deriveActiveStep(status: string, hasAssignedRows: boolean, dispenseFlag: boolean) {
  let step = 0;

  if (
    status === 'payment_success' ||
    status === 'payment_created' ||
    status === 'dispensing' ||
    COMPLETED_STATUSES.has(status)
  ) {
    step = 1;
  }

  if (hasAssignedRows || dispenseFlag) {
    step = Math.max(step, 2);
  }

  if (status === 'dispensing') {
    step = 3;
  }

  if (COMPLETED_STATUSES.has(status)) {
    step = 4;
  }

  return step;
}

function deriveStepStates(activeStep: number, isComplete: boolean): StepState[] {
  if (isComplete) {
    return STEP_CONFIG.map(() => 'complete');
  }

  return STEP_CONFIG.map((_, index) => {
    const stepNumber = index + 1;
    if (activeStep === 0 && index === 0) {
      return 'active';
    }
    if (stepNumber < activeStep) {
      return 'complete';
    }
    if (stepNumber === activeStep) {
      return 'active';
    }
    return 'pending';
  });
}

export function Status({ quantity, paymentId, onBackToDashboard }: StatusProps) {
  const [status, setStatus] = useState<string>('pending');
  const [isLoaded, setIsLoaded] = useState(false);
  const [dispenseFlag, setDispenseFlag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastDispensedAt, setLastDispensedAt] = useState<number | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(paymentId ?? null);
  const [assignedRows, setAssignedRows] = useState<number[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const machinePath = 'vending/machine1';
    const machineRef = ref(realtimeDb, machinePath);

    const unsubscribeMachine = onValue(
      machineRef,
      (snapshot) => {
        setIsLoaded(true);
        const data = snapshot.val() as
          | {
              status?: string;
              dispense?: unknown;
              payment_id?: unknown;
              last_dispensed?: unknown;
              assigned_rows?: unknown;
              progress?: unknown;
              last_error?: unknown;
            }
          | null;

        if (!data) {
          setStatus('unavailable');
          setProgress(0);
          setAssignedRows([]);
          setLastError(null);
          return;
        }

        const machineStatus = typeof data.status === 'string' ? data.status : 'pending';
        setStatus(machineStatus);

        const nextDispenseFlag = Boolean(data.dispense);
        setDispenseFlag(nextDispenseFlag);

        if (typeof data.payment_id === 'string' && data.payment_id.trim().length > 0) {
          setActivePaymentId(data.payment_id);
        }

        if (typeof data.last_dispensed === 'number') {
          setLastDispensedAt(data.last_dispensed);
        }

        const normalizedRows = Array.isArray(data.assigned_rows)
          ? (data.assigned_rows as unknown[])
              .map((row) => Number.parseInt(String(row), 10))
              .filter((rowNumber) => Number.isFinite(rowNumber))
          : [];
        setAssignedRows(normalizedRows);

        const explicitProgress =
          typeof data.progress === 'number' ? clampProgress(data.progress) : null;
        const fallback = fallbackProgress({
          status: machineStatus,
          hasAssignedRows: normalizedRows.length > 0,
          dispenseFlag: nextDispenseFlag,
        });
        setProgress(explicitProgress ?? fallback);

        const errorMessage =
          typeof data.last_error === 'string' && data.last_error.trim().length > 0
            ? data.last_error
            : null;
        setLastError(errorMessage);
      },
      () => setIsLoaded(true),
    );

    return () => {
      unsubscribeMachine();
    };
  }, [paymentId]);

  const hasAssignedRows = assignedRows.length > 0;
  const isComplete = COMPLETED_STATUSES.has(status);
  const isFailure = FAILURE_STATUSES.has(status);
  const displayPaymentId = activePaymentId ?? paymentId ?? '—';
  const assignedRowsText = hasAssignedRows ? assignedRows.join(', ') : 'Pending';

  const activeStep = deriveActiveStep(status, hasAssignedRows, dispenseFlag);
  const stepStates = deriveStepStates(activeStep, isComplete);

  const statusCopy = useMemo(() => {
    if (isComplete) {
      return {
        title: 'Order Complete!',
        description: 'Your chips are ready for pickup.',
      };
    }

    if (isFailure) {
      return {
        title: 'Unable to dispense',
        description: lastError ?? 'Please contact support or try again.',
      };
    }

    if (status === 'dispensing') {
      return {
        title: 'Dispensing in progress',
        description: 'The machine is rotating the selected row.',
      };
    }

    if (hasAssignedRows || dispenseFlag) {
      return {
        title: 'Preparing your order',
        description: 'The vending machine queued your packet for dispensing.',
      };
    }

    if (status === 'payment_success') {
      return {
        title: 'Payment confirmed',
        description: 'We are lining up the dispenser for your chips.',
      };
    }

    if (!isLoaded) {
      return {
        title: 'Fetching status…',
        description: 'Waiting for the vending machine to respond.',
      };
    }

    return {
      title: 'Awaiting update',
      description: 'Listening for the latest status from the vending machine.',
    };
  }, [dispenseFlag, hasAssignedRows, isComplete, isFailure, isLoaded, lastError, status]);

  const formattedDispensedAt = useMemo(() => {
    if (typeof lastDispensedAt !== 'number') {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(lastDispensedAt));
    } catch {
      return '—';
    }
  }, [lastDispensedAt]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle>{statusCopy.title}</CardTitle>
          <CardDescription>{statusCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-gray-600">{progress}% Complete</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center space-y-1">
            <p className="text-sm text-gray-600">Order Summary</p>
            <p className="text-lg font-semibold">{quantity} packet{quantity > 1 ? 's' : ''} of chips</p>
            <p className="text-sm text-gray-600">Total: ₹{quantity * 10}</p>
            <p className="text-xs text-gray-500">Serving from rows: {assignedRowsText}</p>
            <p className="text-xs text-gray-500">Payment ID: {displayPaymentId}</p>
            <p className="text-xs text-gray-500">Last dispensed at: {formattedDispensedAt}</p>
          </div>

          <div className="space-y-3">
            {STEP_CONFIG.map((step, index) => {
              const state = stepStates[index];
              const isStepComplete = state === 'complete';
              const isStepActive = state === 'active';
              const tone = isStepComplete
                ? 'bg-green-50 border-green-200'
                : isStepActive
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200';
              const iconColor = isStepComplete
                ? 'text-green-600'
                : isStepActive
                ? 'text-blue-600'
                : 'text-gray-400';

              return (
                <div
                  key={step.label}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${tone}`}
                >
                  <step.Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        isStepComplete || isStepActive ? 'text-slate-800' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  {isStepComplete ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                </div>
              );
            })}
          </div>

          {isFailure && lastError ? (
            <p className="text-sm text-red-600 text-center">{lastError}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={onBackToDashboard} className="w-full">
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

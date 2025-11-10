'use client';

import { Info } from 'lucide-react';

import { Button } from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

export function DevelopmentNotice() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="fixed bottom-6 right-6 h-11 w-11 rounded-full shadow-lg border border-secondary/40"
        >
          <Info className="h-5 w-5" />
          <span className="sr-only">Project status</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Heads up!</DialogTitle>
          <DialogDescription>
            BhukkadBox is still in development. Here&apos;s what you can expect right now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="text-foreground/80">
            Thanks for exploring the prototype. Current limitations and notes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-left text-foreground/80">
            <li>Only one chips flavour is available, priced at ₹10 per packet.</li>
            <li>Payments run in Razorpay test mode; use the sandbox methods shown during checkout.</li>
            <li>Dispense updates use the Firebase Realtime Database node <code>vending/machine1</code>.</li>
            <li>ESP32 responses are simulated—toggle the status there to mimic hardware feedback.</li>
          </ul>
          <p className="text-foreground/80">
            We&apos;re iterating quickly. Reach out if something looks off or you have feature ideas!
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

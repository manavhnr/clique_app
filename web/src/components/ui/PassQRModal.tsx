'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Pass } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

interface EventSnippet {
  title: string;
  date?: string;
  startTime?: string;
  locationName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pass: Pass | null;
  event?: EventSnippet | null;
  onViewPasses?: () => void;
}

export default function PassQRModal({ open, onClose, pass, event, onViewPasses }: Props) {
  if (!pass) return null;

  return (
    <Modal open={open} onClose={onClose} title="You're in!" size="sm">
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-green-400" />
          </div>
          {event && (
            <>
              <h3 className="text-white font-bold text-lg mt-1">{event.title}</h3>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                {event.date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(event.date)}
                  </span>
                )}
                {event.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatTime(event.startTime)}
                  </span>
                )}
                {event.locationName && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {event.locationName}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="p-4 bg-white rounded-2xl shadow-lg">
            {pass.qrCodeUrl ? (
              <img src={pass.qrCodeUrl} alt="QR Pass" className="w-48 h-48 object-contain" />
            ) : (
              <QRCodeSVG value={pass._id} size={192} />
            )}
          </div>
          <p className="text-xs text-muted">Show this QR at the door for entry</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Done
          </Button>
          {onViewPasses && (
            <Button className="flex-1" onClick={onViewPasses}>
              My Passes
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

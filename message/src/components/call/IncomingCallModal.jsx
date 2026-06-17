import React from 'react';
import { useAppSelector } from '../../store/hooks';

export default function IncomingCallModal({ onAccept, onReject }) {
  const call = useAppSelector((s) => s.call);
  if (!call || call.state !== 'incoming') return null;

  const caller = call.caller || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-[360px] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-200" />
          <div>
            <div className="font-semibold">{caller.username || 'Unknown'}</div>
            <div className="text-xs text-slate-500">{call.callType === 'video' ? 'Video Call' : 'Voice Call'}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-3 justify-end">
          <button type="button" onClick={() => onReject({ from: caller, callId: call.callId })} className="px-4 py-2 rounded bg-red-500 text-white">Reject</button>
          <button type="button" onClick={() => onAccept({ from: caller, callId: call.callId })} className="px-4 py-2 rounded bg-emerald-600 text-white">Accept</button>
        </div>
      </div>
    </div>
  );
}

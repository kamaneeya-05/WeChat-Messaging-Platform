import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';

export default function VoiceCallModal({ localStream, remoteStream, onEnd, onToggleMute }) {
  const call = useAppSelector((s) => s.call);
  const audioRef = useRef(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (remoteStream && audioRef.current) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    let t;
    if (call && call.state === 'connected') {
      t = setInterval(() => setTimer((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [call]);

  if (!call || !['connected', 'calling', 'connecting'].includes(call.state) || call.callType === 'video') return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 rounded-xl bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{call.receiver?.username || call.caller?.username}</div>
          <div className="text-xs text-slate-500">{call.state}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleMute} className="px-3 py-1 rounded bg-slate-100">Mute</button>
          <button onClick={onEnd} className="px-3 py-1 rounded bg-red-500 text-white">End</button>
        </div>
      </div>
      <audio ref={audioRef} />
      <div className="mt-2 text-xs text-slate-400">Duration: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</div>
    </div>
  );
}

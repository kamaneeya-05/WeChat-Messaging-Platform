import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';

export default function VideoCallModal({ localStream, remoteStream, onEnd, onToggleMute, onToggleCamera, onShareScreen }) {
  const call = useAppSelector((s) => s.call);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    let t;
    if (call && call.state === 'connected') {
      t = setInterval(() => setTimer((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [call]);

  if (!call || !['connected', 'calling', 'connecting'].includes(call.state) || call.callType !== 'video') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[90%] max-w-5xl bg-black/80 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3">
          <video ref={remoteRef} autoPlay playsInline className="w-full h-[60vh] object-cover rounded" />
          <div className="flex flex-col gap-3">
            <video ref={localRef} autoPlay muted playsInline className="w-full h-40 object-cover rounded bg-slate-900" />
            <div className="flex items-center gap-2">
              <button onClick={onToggleMute} className="px-3 py-1 rounded bg-slate-100">Mute</button>
              <button onClick={onToggleCamera} className="px-3 py-1 rounded bg-slate-100">Camera</button>
              <button onClick={onShareScreen} className="px-3 py-1 rounded bg-slate-100">Share</button>
              <button onClick={onEnd} className="ml-auto px-3 py-1 rounded bg-red-500 text-white">End</button>
            </div>
            <div className="text-xs text-slate-300">Duration: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

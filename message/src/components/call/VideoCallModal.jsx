import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { attachStreamToVideo } from '../../services/webrtcService';

const STATUS_LABEL = {
  calling: 'Calling…',
  connecting: 'Connecting…',
  connected: 'Connected',
};

export default function VideoCallModal({ localStream, remoteStream, onEnd, onToggleMute, onToggleCamera, onShareScreen }) {
  const call = useAppSelector((s) => s.call);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    attachStreamToVideo(localRef.current, localStream);
  }, [localStream]);

  useEffect(() => {
    attachStreamToVideo(remoteRef.current, remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    let t;
    if (call?.state === 'connected') {
      t = setInterval(() => setTimer((s) => s + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(t);
  }, [call?.state]);

  if (!call || !['connected', 'calling', 'connecting'].includes(call.state) || call.callType !== 'video') {
    return null;
  }

  const peerName = call.receiver?.username || call.caller?.username || 'User';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex h-full w-full max-w-lg flex-col bg-black p-3 sm:max-w-5xl sm:rounded-lg sm:p-4">
        <div className="mb-2 text-center text-sm text-slate-300">
          {peerName} · {STATUS_LABEL[call.state] || call.state}
        </div>

        <div className="relative min-h-0 flex-1">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="h-full w-full rounded bg-slate-900 object-cover"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              Waiting for video…
            </div>
          )}
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-3 right-3 h-24 w-20 rounded border border-white/30 bg-slate-900 object-cover sm:h-32 sm:w-40"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={onToggleMute} className="rounded bg-slate-100 px-3 py-2 text-sm">Mute</button>
          <button type="button" onClick={onToggleCamera} className="rounded bg-slate-100 px-3 py-2 text-sm">Camera</button>
          <button type="button" onClick={onShareScreen} className="hidden rounded bg-slate-100 px-3 py-2 text-sm sm:inline">Share</button>
          <button type="button" onClick={onEnd} className="rounded bg-red-500 px-4 py-2 text-sm text-white">End</button>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400">
          Duration: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIncoming, setCalling, setConnecting, setConnected, setEnded, resetCall } from '../store/features/callSlice';
import { createPeerConnection, createOffer, createAnswer, addIceCandidate, applyRemoteDescription, replaceTrack } from '../services/webrtcService';

export function useCall(socket) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const callState = useAppSelector((s) => s.call);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callTypeRef = useRef('voice');
  const peerUserIdRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const cleanup = useCallback(() => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((t) => t.stop());
        remoteStreamRef.current = null;
        setRemoteStream(null);
      }
      callIdRef.current = null;
      callTypeRef.current = 'voice';
      peerUserIdRef.current = null;
      dispatch(resetCall());
    } catch (err) {
      console.warn('cleanup error', err);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      callIdRef.current = payload.callId;
      callTypeRef.current = payload.callType || 'voice';
      peerUserIdRef.current = payload.from?._id || payload.from?.id;
      dispatch(setIncoming({
        caller: payload.from,
        callType: payload.callType,
        roomId: payload.roomId,
        callId: payload.callId,
      }));
    };

    const handleCallInitiated = ({ callId, toUserId }) => {
      callIdRef.current = callId;
      peerUserIdRef.current = toUserId;
    };

    const handleOffer = async ({ from, offer, callId, callType }) => {
      const peerId = from._id || from.id;
      const isVideo = (callType || callTypeRef.current) === 'video';

      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        localStreamRef.current = s;
        setLocalStream(s);
      } catch (err) {
        console.error('getUserMedia failed for answerer', err);
        alert('Could not access microphone/camera');
        return;
      }

      pcRef.current = createPeerConnection({
        onTrack: (stream) => {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        },
        onIceCandidate: (candidate) => {
          socket.emit('ice-candidate', { toUserId: peerId, candidate, callId: callId || callIdRef.current });
        },
      });

      await applyRemoteDescription(pcRef.current, offer);
      const answer = await createAnswer(pcRef.current, localStreamRef.current);
      socket.emit('answer', { toUserId: peerId, fromUser: user, answer, callId: callId || callIdRef.current });
      dispatch(setConnected({ caller: from, receiver: user, callId: callId || callIdRef.current, callType: callType || callTypeRef.current }));
    };

    const handleAnswer = async ({ answer }) => {
      if (pcRef.current) {
        await applyRemoteDescription(pcRef.current, answer);
      }
    };

    const handleAccepted = async ({ from, callId }) => {
      if (!pcRef.current || !localStreamRef.current) return;

      const peerId = from._id || from.id;
      callIdRef.current = callId;

      try {
        const offer = await createOffer(pcRef.current, localStreamRef.current);
        socket.emit('offer', {
          toUserId: peerId,
          fromUser: user,
          offer,
          callId,
          callType: callTypeRef.current,
        });
        dispatch(setConnected({ caller: user, receiver: from, callId, callType: callTypeRef.current }));
      } catch (err) {
        console.error('Error creating/sending offer:', err);
        cleanup();
      }
    };

    const handleRejected = () => {
      dispatch(setEnded({ reason: 'rejected', callId: callIdRef.current }));
      cleanup();
    };

    const handleEnd = () => {
      dispatch(setEnded({ reason: 'ended', callId: callIdRef.current }));
      cleanup();
    };

    const handleCallError = ({ message }) => {
      alert(message);
      cleanup();
    };

    const handleIce = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        await addIceCandidate(pcRef.current, candidate);
      }
    };

    socket.on('incoming-call', handleIncoming);
    socket.on('call-initiated', handleCallInitiated);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('call-accepted', handleAccepted);
    socket.on('call-rejected', handleRejected);
    socket.on('end-call', handleEnd);
    socket.on('call-error', handleCallError);

    return () => {
      socket.off('incoming-call', handleIncoming);
      socket.off('call-initiated', handleCallInitiated);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIce);
      socket.off('call-accepted', handleAccepted);
      socket.off('call-rejected', handleRejected);
      socket.off('end-call', handleEnd);
      socket.off('call-error', handleCallError);
    };
  }, [socket, dispatch, user, cleanup]);

  const startCall = useCallback(async ({ targetUser, callType = 'voice' }) => {
    if (!socket || !targetUser) return;

    const targetId = targetUser._id || targetUser.id;
    callTypeRef.current = callType;
    peerUserIdRef.current = targetId;

    dispatch(setCalling({ caller: user, receiver: targetUser, callType }));

    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = s;
      setLocalStream(s);

      pcRef.current = createPeerConnection({
        onTrack: (stream) => {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        },
        onIceCandidate: (candidate) => {
          socket.emit('ice-candidate', { toUserId: targetId, candidate, callId: callIdRef.current });
        },
      });

      // Offer is created only after callee accepts (in handleAccepted)
      socket.emit('call-user', { toUserId: targetId, fromUser: user, callType });
    } catch (err) {
      console.error('startCall failed', err);
      cleanup();
    }
  }, [socket, user, dispatch, cleanup]);

  const acceptCall = useCallback(({ from, callId }) => {
    if (!socket) return;
    const peerId = from._id || from.id;
    callIdRef.current = callId;
    peerUserIdRef.current = peerId;
    dispatch(setConnecting({ caller: from, receiver: user, callId, callType: callTypeRef.current }));
    socket.emit('call-accepted', { toUserId: peerId, fromUser: user, callId });
  }, [socket, user, dispatch]);

  const rejectCall = useCallback(({ from, callId }) => {
    if (!socket) return;
    socket.emit('call-rejected', { toUserId: from._id || from.id, fromUser: user, callId });
    cleanup();
  }, [socket, user, cleanup]);

  const endCall = useCallback(({ toUser, callId } = {}) => {
    if (!socket) return;
    const peerId = toUser?._id || toUser?.id || peerUserIdRef.current;
    if (peerId) {
      socket.emit('end-call', {
        toUserId: peerId,
        fromUser: user,
        callId: callId || callIdRef.current,
      });
    }
    cleanup();
  }, [socket, user, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      replaceTrack(pcRef.current, oldTrack, screenTrack);
      screenTrack.onended = async () => {
        if (oldTrack) replaceTrack(pcRef.current, screenTrack, oldTrack);
      };
    } catch (err) {
      console.warn('screen share failed', err);
    }
  }, []);

  return {
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    startScreenShare,
    cleanup,
    callState,
  };
}

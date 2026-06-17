import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIncoming, setCalling, setConnected, setEnded, resetCall } from '../store/features/callSlice';
import { createPeerConnection, createOffer, createAnswer, addIceCandidate, applyRemoteDescription, replaceTrack } from '../services/webrtcService';

export function useCall(socket) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const callState = useAppSelector((s) => s.call);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      dispatch(setIncoming({ caller: payload.from, callType: payload.callType, roomId: payload.roomId, callId: payload.callId }));
    };

    const handleOffer = async ({ from, offer, callId }) => {
      // Prepare local stream
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: offer?.type === 'video' || false });
        localStreamRef.current = s;
        setLocalStream(s);
      } catch (err) {
        console.error('getUserMedia failed for answerer', err);
      }

      pcRef.current = createPeerConnection({
        onTrack: (stream) => {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        },
        onIceCandidate: (candidate) => {
          socket.emit('ice-candidate', { toUserId: from._id || from.id, candidate, callId });
        }
      });

      await applyRemoteDescription(pcRef.current, offer);
      const answer = await createAnswer(pcRef.current, localStreamRef.current);
      socket.emit('answer', { toUserId: from._id || from.id, fromUser: user, answer, callId });
      dispatch(setConnected({ caller: from, receiver: user, callId }));
    };

    const handleAnswer = async ({ from, answer, callId }) => {
      if (pcRef.current) {
        await applyRemoteDescription(pcRef.current, answer);
      }
    };

    const handleIce = async ({ candidate }) => {
      if (pcRef.current) addIceCandidate(pcRef.current, candidate);
    };

    const handleAccepted = ({ from, callId }) => {
      dispatch(setConnected({ caller: user, receiver: from, callId }));
    };

    const handleRejected = ({ from, callId }) => {
      dispatch(setEnded({ reason: 'rejected', callId }));
      cleanup();
    };

    const handleEnd = ({ from, callId }) => {
      dispatch(setEnded({ reason: 'ended', callId }));
      cleanup();
    };

    socket.on('incoming-call', handleIncoming);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('call-accepted', handleAccepted);
    socket.on('call-rejected', handleRejected);
    socket.on('end-call', handleEnd);

    return () => {
      socket.off('incoming-call', handleIncoming);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIce);
      socket.off('call-accepted', handleAccepted);
      socket.off('call-rejected', handleRejected);
      socket.off('end-call', handleEnd);
    };
  }, [socket, dispatch, user]);

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
      dispatch(resetCall());
    } catch (err) {
      console.warn('cleanup error', err);
    }
  }, [dispatch]);

  const startCall = useCallback(async ({ targetUser, callType = 'voice' }) => {
    if (!socket || !targetUser) return;
    // Check online status
    if (targetUser.status === 'offline') {
      alert('User is currently offline');
      return;
    }

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
          socket.emit('ice-candidate', { toUserId: targetUser._id || targetUser.id, candidate });
        }
      });

      const offer = await createOffer(pcRef.current, s);
      socket.emit('call-user', { toUserId: targetUser._id || targetUser.id, fromUser: user, callType, offer });
    } catch (err) {
      console.error('startCall failed', err);
      cleanup();
    }
  }, [socket, user, dispatch, cleanup]);

  const acceptCall = useCallback(async ({ from, callId }) => {
    if (!socket) return;
    // notify accept
    socket.emit('call-accepted', { toUserId: from._id || from.id, fromUser: user, callId });
  }, [socket, user]);

  const rejectCall = useCallback(({ from, callId }) => {
    if (!socket) return;
    socket.emit('call-rejected', { toUserId: from._id || from.id, fromUser: user, callId });
    cleanup();
  }, [socket, user, cleanup]);

  const endCall = useCallback(({ toUser }) => {
    if (!socket) return;
    socket.emit('end-call', { toUserId: toUser._id || toUser.id, fromUser: user });
    cleanup();
  }, [socket, user, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      replaceTrack(pcRef.current, oldTrack, screenTrack);
      // When user stops screen share, restore camera
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

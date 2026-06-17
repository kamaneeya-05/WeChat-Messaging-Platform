import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIncoming, setCalling, setConnecting, setConnected, setEnded, resetCall } from '../store/features/callSlice';
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  addIceCandidate,
  applyRemoteDescription,
  flushIceQueue,
  replaceTrack,
} from '../services/webrtcService';

function peerId(user) {
  return String(user?._id || user?.id || '');
}

export function useCall(socket) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const callState = useAppSelector((s) => s.call);

  const userRef = useRef(user);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callTypeRef = useRef('voice');
  const peerUserIdRef = useRef(null);
  const iceQueueRef = useRef([]);
  const isCallerRef = useRef(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
      iceQueueRef.current = [];
      isCallerRef.current = false;
      dispatch(resetCall());
    } catch (err) {
      console.warn('cleanup error', err);
    }
  }, [dispatch]);

  const createCallPeerConnection = useCallback((targetId) => {
    const pc = createPeerConnection({
      onTrack: (stream) => {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      },
      onIceCandidate: (candidate) => {
        if (!socket || !targetId) return;
        socket.emit('ice-candidate', {
          toUserId: targetId,
          candidate,
          callId: callIdRef.current,
        });
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          dispatch(setConnected({
            callId: callIdRef.current,
            callType: callTypeRef.current,
          }));
        }
      },
    });
    pcRef.current = pc;
    return pc;
  }, [socket, dispatch]);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      callIdRef.current = payload.callId;
      callTypeRef.current = payload.callType || 'voice';
      peerUserIdRef.current = peerId(payload.from);
      isCallerRef.current = false;
      dispatch(setIncoming({
        caller: payload.from,
        callType: payload.callType,
        roomId: payload.roomId,
        callId: payload.callId,
      }));
    };

    const handleCallInitiated = ({ callId, toUserId }) => {
      callIdRef.current = callId;
      peerUserIdRef.current = String(toUserId);
    };

    const handleOffer = async ({ from, offer, callId, callType }) => {
      const targetId = peerId(from);
      const isVideo = (callType || callTypeRef.current) === 'video';
      callIdRef.current = callId || callIdRef.current;
      callTypeRef.current = callType || callTypeRef.current;

      try {
        if (!localStreamRef.current) {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
          localStreamRef.current = s;
          setLocalStream(s);
        }

        if (pcRef.current) {
          pcRef.current.close();
        }
        iceQueueRef.current = [];
        const pc = createCallPeerConnection(targetId);

        await applyRemoteDescription(pc, offer);
        await flushIceQueue(pc, iceQueueRef.current);

        const answer = await createAnswer(pc, localStreamRef.current);
        socket.emit('answer', {
          toUserId: targetId,
          fromUser: userRef.current,
          answer,
          callId: callIdRef.current,
        });
        dispatch(setConnected({
          caller: from,
          receiver: userRef.current,
          callId: callIdRef.current,
          callType: callTypeRef.current,
        }));
      } catch (err) {
        console.error('handleOffer failed', err);
        alert('Could not connect the call. Please try again.');
        cleanup();
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        if (!pcRef.current) return;
        await applyRemoteDescription(pcRef.current, answer);
        await flushIceQueue(pcRef.current, iceQueueRef.current);
        dispatch(setConnected({
          caller: userRef.current,
          receiver: { _id: peerUserIdRef.current },
          callId: callIdRef.current,
          callType: callTypeRef.current,
        }));
      } catch (err) {
        console.error('handleAnswer failed', err);
        cleanup();
      }
    };

    const handleAccepted = async ({ from, callId }) => {
      if (!pcRef.current || !localStreamRef.current) {
        console.error('Call accepted but peer connection not ready');
        alert('Call connection failed. Please try again.');
        cleanup();
        return;
      }

      const targetId = peerId(from);
      callIdRef.current = callId;

      try {
        const offer = await createOffer(pcRef.current, localStreamRef.current);
        socket.emit('offer', {
          toUserId: targetId,
          fromUser: userRef.current,
          offer,
          callId,
          callType: callTypeRef.current,
        });
        dispatch(setConnecting({
          caller: userRef.current,
          receiver: from,
          callId,
          callType: callTypeRef.current,
        }));
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
      if (!candidate) return;
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        iceQueueRef.current.push(candidate);
        return;
      }
      await addIceCandidate(pcRef.current, candidate);
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
  }, [socket, dispatch, cleanup, createCallPeerConnection]);

  const startCall = useCallback(async ({ targetUser, callType = 'voice' }) => {
    if (!socket || !targetUser) return;

    const targetId = peerId(targetUser);
    callTypeRef.current = callType;
    peerUserIdRef.current = targetId;
    isCallerRef.current = true;
    iceQueueRef.current = [];

    dispatch(setCalling({ caller: userRef.current, receiver: targetUser, callType }));

    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = s;
      setLocalStream(s);

      if (pcRef.current) pcRef.current.close();
      createCallPeerConnection(targetId);

      socket.emit('call-user', { toUserId: targetId, fromUser: userRef.current, callType });
    } catch (err) {
      console.error('startCall failed', err);
      alert('Could not access microphone/camera. Please allow permissions and try again.');
      cleanup();
    }
  }, [socket, dispatch, cleanup, createCallPeerConnection]);

  const acceptCall = useCallback(async ({ from, callId }) => {
    if (!socket) return;

    const targetId = peerId(from);
    callIdRef.current = callId;
    peerUserIdRef.current = targetId;
    isCallerRef.current = false;
    iceQueueRef.current = [];

    const isVideo = callTypeRef.current === 'video';

    try {
      // Must request media in the accept click handler (required on mobile browsers)
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = s;
      setLocalStream(s);
    } catch (err) {
      console.error('getUserMedia failed on accept', err);
      alert('Could not access microphone/camera. Please allow permissions and try again.');
      socket.emit('call-rejected', { toUserId: targetId, fromUser: userRef.current, callId });
      cleanup();
      return;
    }

    dispatch(setConnecting({
      caller: from,
      receiver: userRef.current,
      callId,
      callType: callTypeRef.current,
    }));

    socket.emit('call-accepted', { toUserId: targetId, fromUser: userRef.current, callId });
  }, [socket, dispatch, cleanup]);

  const rejectCall = useCallback(({ from, callId }) => {
    if (!socket) return;
    socket.emit('call-rejected', { toUserId: peerId(from), fromUser: userRef.current, callId });
    cleanup();
  }, [socket, cleanup]);

  const endCall = useCallback(({ toUser, callId } = {}) => {
    if (!socket) return;
    const targetId = toUser ? peerId(toUser) : peerUserIdRef.current;
    if (targetId) {
      socket.emit('end-call', {
        toUserId: targetId,
        fromUser: userRef.current,
        callId: callId || callIdRef.current,
      });
    }
    cleanup();
  }, [socket, cleanup]);

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
      screenTrack.onended = () => {
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

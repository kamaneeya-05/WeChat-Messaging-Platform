import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials } from '../store/features/authSlice';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Send, 
  Paperclip, 
  Download, 
  AlertCircle, 
  Circle, 
  User, 
  MessageSquare,
  Users,
  FileText
} from 'lucide-react';
import { API_BASE_URL, toMediaUrl } from '../config/api';

export function SupportCallRoom() {
  const { token: sessionToken } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // State
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Active Call State
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [reconnectGraceSeconds, setReconnectGraceSeconds] = useState(15);
  const [participants, setParticipants] = useState([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('none'); // none, in_progress, processing, ready
  const [recordingUrl, setRecordingUrl] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteImgRef = useRef(null);
  const canvasIntervalRef = useRef(null);
  const chatEndRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Audio Playout Refs
  const localAudioContextRef = useRef(null);
  const remoteAudioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const localMicSourceRef = useRef(null);

  // Recording Refs
  const recordingCanvasRef = useRef(null);
  const recordingCtxRef = useRef(null);
  const recordingAudioDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingDrawLoopRef = useRef(null);

  // Redux Auth State
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Safe ref value check for socket event handlers
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // 1. Fetch Session Info on Load
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/support/session/${sessionToken}`);
        if (data.status === 'ended') {
          setSessionError('This support session has already ended.');
        } else {
          setSession(data);
        }
      } catch (err) {
        setSessionError('Invalid or expired support session invitation.');
      }
    };
    fetchSessionInfo();
  }, [sessionToken]);

  // 2. Handle Guest Join (Submit Guest name)
  const handleGuestJoin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsJoining(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/support/join`, {
        name: guestName.trim(),
        token: sessionToken
      });
      // Store credentials in Redux & LocalStorage & Axios Headers
      dispatch(setCredentials({
        user: data.user,
        token: data.token
      }));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setSession(data.session);
      setJoined(true);
    } catch (err) {
      console.error('Failed to join support room', err);
      setSessionError('Failed to join support call.');
    } finally {
      setIsJoining(false);
    }
  };

  // 3. Auto-join if already authenticated (e.g. Agent)
  useEffect(() => {
    if (session && isAuthenticated && user && !joined) {
      setJoined(true);
    }
  }, [session, isAuthenticated, user, joined]);

  // 4. Start the Call logic once joined
  useEffect(() => {
    if (!joined || !session || !user) return;

    // A. Connect Socket
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected for support call');
      setIsDisconnected(false);
      
      // Join call room
      socket.emit('join support call', {
        sessionId: session._id,
        userId: user.id || user._id,
        userName: user.username || user.name,
        role: user.role
      });
    });

    socket.on('disconnect', () => {
      console.warn('Socket connection lost!');
      setIsDisconnected(true);
      startReconnectTimer();
    });

    // B. Socket Listeners
    socket.on('active-participants', (list) => {
      setParticipants(list);
    });

    socket.on('participant-joined', ({ userId, userName, role }) => {
      setParticipants(prev => {
        if (prev.find(p => p.userId === userId)) return prev;
        return [...prev, { userId, userName, role }];
      });
    });

    socket.on('participant-left', ({ userId, userName }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      // If customer leaves, clear the remote video slot
      if (user.role === 'agent') {
        if (remoteImgRef.current) remoteImgRef.current.src = '';
      }
    });

    socket.on('stream-video', ({ senderId, frame }) => {
      if (remoteImgRef.current) {
        remoteImgRef.current.src = frame;
      }
    });

    socket.on('stream-audio', ({ senderId, audio }) => {
      playRemoteAudio(audio);
    });

    socket.on('remote-media-toggle', ({ senderId, type, value }) => {
      if (type === 'mute') {
        setIsRemoteMuted(value);
      } else if (type === 'video') {
        setIsRemoteVideoOff(value);
        if (value && remoteImgRef.current) {
          remoteImgRef.current.src = '';
        }
      }
    });

    socket.on('recording-state-changed', ({ isRecording }) => {
      setIsRecording(isRecording);
      setRecordingStatus(isRecording ? 'in_progress' : 'processing');
    });

    socket.on('call-ended-by-agent', () => {
      cleanupMedia();
      alert('The call session has been ended by the support agent.');
      navigate(user.role === 'agent' ? '/support' : '/');
    });

    // Fetch Chat History
    const fetchChatHistory = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/messages/${session.chatId}`);
        setChatMessages(data);
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchChatHistory();

    socket.emit('join chat', session.chatId);

    socket.on('message received', (newMessage) => {
      if (newMessage.chatId === session.chatId) {
        setChatMessages(prev => [...prev, newMessage]);
      }
    });

    // C. Get Local Media and start streaming
    startLocalMedia(socket);

    return () => {
      cleanupMedia();
    };
  }, [joined]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reconnection timer
  const startReconnectTimer = () => {
    if (reconnectTimerRef.current) clearInterval(reconnectTimerRef.current);
    setReconnectGraceSeconds(15);
    reconnectTimerRef.current = setInterval(() => {
      setReconnectGraceSeconds(prev => {
        if (prev <= 1) {
          clearInterval(reconnectTimerRef.current);
          alert('Reconnection window expired. Returning to dashboard.');
          navigate(user?.role === 'agent' ? '/support' : '/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!isDisconnected && reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
    }
  }, [isDisconnected]);

  // Start Media Capture & Playout Setup
  const startLocalMedia = async (socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 12 },
        audio: true
      });
      setLocalStream(stream);

      // Bind to local video preview element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 1. Setup AudioContext for MIC capture and conversion
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      localAudioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      localMicSourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || !socketRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        socketRef.current.emit('stream-audio', {
          sessionId: session._id,
          audio: int16Array.buffer
        });
      };

      // 2. Setup AudioContext for REMOTE playout
      remoteAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      nextStartTimeRef.current = remoteAudioContextRef.current.currentTime;

      // 3. Start Video frame capture canvas loop (12 fps)
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = 320;
      offscreenCanvas.height = 240;
      const offscreenCtx = offscreenCanvas.getContext('2d');

      canvasIntervalRef.current = setInterval(() => {
        if (isVideoOff || !localVideoRef.current || !socketRef.current) return;
        
        try {
          offscreenCtx.drawImage(localVideoRef.current, 0, 0, 320, 240);
          const frame = offscreenCanvas.toDataURL('image/jpeg', 0.4); // compressed JPEG
          socketRef.current.emit('stream-video', {
            sessionId: session._id,
            frame
          });
        } catch (err) {
          console.error('Video capture error:', err);
        }
      }, 85); // roughly 12 FPS

    } catch (err) {
      console.error('Failed to access camera/microphone:', err);
      alert('Please grant camera and microphone access to join the support call.');
    }
  };

  // Play remote audio chunks sequentially
  const playRemoteAudio = (arrayBuffer) => {
    if (!remoteAudioContextRef.current) return;

    try {
      const int16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const ctx = remoteAudioContextRef.current;
      const buffer = ctx.createBuffer(1, float32.length, ctx.sampleRate);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Connect remote playout to recording stream if recording is active
      if (recordingAudioDestRef.current && isRecordingRef.current) {
        source.connect(recordingAudioDestRef.current);
      }

      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
    } catch (err) {
      console.error('Remote playout failure:', err);
    }
  };

  // Toggles for Local Media
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socketRef.current?.emit('toggle-media', {
          sessionId: session._id,
          type: 'mute',
          value: !audioTrack.enabled
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socketRef.current?.emit('toggle-media', {
          sessionId: session._id,
          type: 'video',
          value: !videoTrack.enabled
        });
      }
    }
  };

  // Chat message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/messages`, {
        content: chatInput,
        chatId: session.chatId
      });
      setChatMessages(prev => [...prev, data]);
      socketRef.current?.emit('new message', data);
      setChatInput('');
    } catch (err) {
      console.error('Failed to send text message', err);
    }
  };

  // File Share upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('chatId', session.chatId);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/messages/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setChatMessages(prev => [...prev, data]);
      socketRef.current?.emit('new message', data);
    } catch (err) {
      console.error('Failed to share file in chat', err);
      alert('Error uploading file (max size 15MB)');
    } finally {
      setUploadingFile(false);
    }
  };

  // Clean end call session (Agent)
  const handleEndCall = () => {
    if (window.confirm('Are you sure you want to end this support session? This will disconnect all participants.')) {
      socketRef.current?.emit('end-support-call', { sessionId: session._id });
      cleanupMedia();
      navigate('/support');
    }
  };

  // Customer leave session
  const handleLeaveCall = () => {
    socketRef.current?.emit('leave support call');
    cleanupMedia();
    navigate('/');
  };

  // Clean up references and tracks
  const cleanupMedia = () => {
    if (canvasIntervalRef.current) clearInterval(canvasIntervalRef.current);
    if (reconnectTimerRef.current) clearInterval(reconnectTimerRef.current);
    if (recordingDrawLoopRef.current) cancelAnimationFrame(recordingDrawLoopRef.current);

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }

    if (localAudioContextRef.current) {
      localAudioContextRef.current.close().catch(() => {});
    }
    if (remoteAudioContextRef.current) {
      remoteAudioContextRef.current.close().catch(() => {});
    }

    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // Start Call Recording (Agent only)
  const startRecording = async () => {
    if (user.role !== 'agent') return;

    try {
      recordedChunksRef.current = [];

      // 1. Create recording canvas & context
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = 640;
      recordCanvas.height = 360;
      const recordCtx = recordCanvas.getContext('2d');
      
      recordingCanvasRef.current = recordCanvas;
      recordingCtxRef.current = recordCtx;

      // 2. Mix local & remote audio into recording destination
      if (!localAudioContextRef.current) {
        throw new Error('Local audio context not configured.');
      }
      
      const audioCtx = localAudioContextRef.current;
      const audioDest = audioCtx.createMediaStreamDestination();
      recordingAudioDestRef.current = audioDest;

      // Connect local mic source to mixed destination
      if (localMicSourceRef.current) {
        localMicSourceRef.current.connect(audioDest);
      }

      // 3. Composite video stream capture loop
      const drawRecordingFrame = () => {
        if (!isRecordingRef.current) return;
        
        recordCtx.fillStyle = '#1e293b'; // Slate 800 background
        recordCtx.fillRect(0, 0, 640, 360);

        // A. Draw Local Stream (Left Column)
        if (localVideoRef.current && !isVideoOff) {
          recordCtx.drawImage(localVideoRef.current, 10, 30, 300, 300);
        } else {
          recordCtx.fillStyle = '#0f172a';
          recordCtx.fillRect(10, 30, 300, 300);
          recordCtx.fillStyle = '#ffffff';
          recordCtx.font = '14px Arial';
          recordCtx.fillText('Agent Camera Off', 100, 180);
        }

        // B. Draw Remote Stream (Right Column)
        if (remoteImgRef.current && remoteImgRef.current.src && !isRemoteVideoOff) {
          recordCtx.drawImage(remoteImgRef.current, 330, 30, 300, 300);
        } else {
          recordCtx.fillStyle = '#0f172a';
          recordCtx.fillRect(330, 30, 300, 300);
          recordCtx.fillStyle = '#ffffff';
          recordCtx.font = '14px Arial';
          recordCtx.fillText('Customer Camera Off', 410, 180);
        }

        // Add Watermark labels
        recordCtx.fillStyle = '#10b981';
        recordCtx.font = 'bold 12px Arial';
        recordCtx.fillText('AGENT', 20, 50);
        recordCtx.fillStyle = '#6366f1';
        recordCtx.fillText('CUSTOMER', 340, 50);

        recordingDrawLoopRef.current = requestAnimationFrame(drawRecordingFrame);
      };

      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingStatus('in_progress');

      // Start draw animation loop
      drawRecordingFrame();

      // 4. Capture Canvas stream and mix audio track
      const canvasStream = recordCanvas.captureStream(12); // 12 FPS
      const audioTrack = audioDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      // 5. Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setRecordingStatus('processing');
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        // Upload to backend
        const formData = new FormData();
        formData.append('recording', blob, `recording_${session._id}.webm`);

        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/support/session/${session._id}/recording`, 
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          setRecordingUrl(data.recordingUrl);
          setRecordingStatus('ready');
          alert('Recording completed and processed successfully!');
        } catch (err) {
          console.error('Failed to upload recording file:', err);
          setRecordingStatus('none');
          alert('Error saving the recording file on the server.');
        }
      };

      mediaRecorder.start();
      socketRef.current?.emit('toggle-recording', { sessionId: session._id, isRecording: true });

    } catch (err) {
      console.error('Failed to initialize recording:', err);
      setIsRecording(false);
      setRecordingStatus('none');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      socketRef.current?.emit('toggle-recording', { sessionId: session._id, isRecording: false });
      if (recordingDrawLoopRef.current) cancelAnimationFrame(recordingDrawLoopRef.current);
    }
  };

  // Render Functions
  if (sessionError) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-800/80 p-8 shadow-2xl text-center backdrop-blur-xl">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Invite Verification Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{sessionError}</p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  // Join Form for guest customers
  if (!joined) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-850 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40 mb-3">
              <Video className="text-white" size={22} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Join Support Session</h2>
            <p className="text-xs text-slate-400 mt-1">Please enter your name to connect with the agent.</p>
          </div>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">Your Name</label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-cyan-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isJoining ? 'Joining call...' : 'Join Call'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Live Call View
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-white flex flex-col p-4 font-sans select-none">
      
      {/* Reconnection Banner */}
      {isDisconnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600/90 border border-red-500 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl z-50 animate-bounce">
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <div className="text-xs">
            <p className="font-bold">Connection Lost!</p>
            <p className="opacity-90">Attempting reconnect within grace window ({reconnectGraceSeconds}s)...</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Support Room</h1>
            <p className="text-[10px] text-slate-400 font-mono">Invite: {sessionToken.substring(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Recording Badge */}
          {recordingStatus === 'in_progress' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold tracking-wider uppercase animate-pulse">
              <Circle size={8} fill="currentColor" /> REC
            </div>
          )}
          {recordingStatus === 'processing' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold tracking-wider uppercase">
              Processing Rec...
            </div>
          )}
          {recordingStatus === 'ready' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold tracking-wider uppercase">
              Rec Ready
            </div>
          )}
          
          <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl">
            <Users size={12} /> {participants.length} Active
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 min-h-0 flex gap-4 my-4">
        
        {/* Video Grid */}
        <div className="flex-1 min-w-0 flex flex-col justify-between rounded-3xl border border-white/5 bg-white/2.5 p-4 relative">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            
            {/* Local Video Card */}
            <div className="h-full rounded-2xl bg-slate-900 border border-white/5 overflow-hidden relative flex items-center justify-center group shadow-inner">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-500 mb-2">
                    <User size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-400">Camera Disabled</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/5 text-[11px] font-bold text-slate-200">
                You ({user.role === 'agent' ? 'Agent' : 'Customer'})
                {isMuted && <span className="ml-1.5 text-red-500">Muted</span>}
              </div>
            </div>

            {/* Remote Video Card */}
            <div className="h-full rounded-2xl bg-slate-900 border border-white/5 overflow-hidden relative flex items-center justify-center group shadow-inner">
              {/* Uses img for WebSocket video feed */}
              <img
                ref={remoteImgRef}
                alt=""
                className={`w-full h-full object-cover ${isRemoteVideoOff || !remoteImgRef.current?.src ? 'hidden' : ''}`}
              />
              {(isRemoteVideoOff || !remoteImgRef.current?.src) && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-500 mb-2">
                    <User size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-400">
                    {participants.length < 2 ? 'Waiting for Participant...' : 'Camera Disabled'}
                  </p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/5 text-[11px] font-bold text-slate-200">
                {user.role === 'agent' ? 'Customer' : 'Support Agent'}
                {isRemoteMuted && <span className="ml-1.5 text-red-500">Muted</span>}
              </div>
            </div>

          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-3.5 mt-4 pt-3 border-t border-white/5">
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl border transition shadow-lg ${
                isMuted 
                  ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl border transition shadow-lg ${
                isVideoOff 
                  ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
              }`}
              title={isVideoOff ? 'Enable camera' : 'Disable camera'}
            >
              {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            {/* Recording Trigger (Agent Only) */}
            {user.role === 'agent' && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={recordingStatus === 'processing'}
                className={`px-4.5 py-3 rounded-2xl border font-bold text-xs shadow-lg transition flex items-center gap-2 ${
                  isRecording
                    ? 'bg-red-500 border-red-600 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 disabled:opacity-40'
                }`}
              >
                <Circle size={12} fill={isRecording ? 'currentColor' : 'none'} />
                {isRecording ? 'Stop Recording' : 'Record Session'}
              </button>
            )}

            <button
              onClick={user.role === 'agent' ? handleEndCall : handleLeaveCall}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/20 flex items-center gap-2 transition"
            >
              <PhoneOff size={14} /> {user.role === 'agent' ? 'End Session' : 'Leave Call'}
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-80 flex flex-col rounded-3xl border border-white/5 bg-white/2.5 overflow-hidden">
          
          <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2 bg-white/2.5">
            <MessageSquare size={16} className="text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Session Chat</h2>
          </div>

          {/* Messages Log */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <MessageSquare size={24} className="mb-2 opacity-50" />
                <p className="text-xs">No messages yet</p>
                <p className="text-[10px] opacity-75 mt-0.5">Send a message to start conversing.</p>
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isMe = msg.senderId?._id === user.id || msg.senderId?._id === user._id || msg.senderId === user.id || msg.senderId === user._id;
                
                return (
                  <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-semibold text-slate-500 mb-0.5">
                      {isMe ? 'You' : msg.senderId?.username || 'User'}
                    </span>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-normal shadow-sm ${
                      isMe 
                        ? 'bg-emerald-500 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}>
                      {msg.content && <p>{msg.content}</p>}
                      
                      {msg.mediaUrl && (
                        <div className="mt-1">
                          {msg.mediaType === 'image' ? (
                            <img 
                              src={toMediaUrl(msg.mediaUrl)} 
                              alt={msg.mediaName} 
                              className="rounded-lg max-h-32 object-cover cursor-pointer hover:opacity-90 transition border border-white/10"
                              onClick={() => window.open(toMediaUrl(msg.mediaUrl), '_blank')}
                            />
                          ) : (
                            <a
                              href={toMediaUrl(msg.mediaUrl)}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/20 hover:bg-black/35 font-bold transition overflow-hidden text-ellipsis whitespace-nowrap text-[10px]"
                            >
                              <FileText size={12} className="flex-shrink-0" />
                              <span className="truncate flex-1">{msg.mediaName}</span>
                              <Download size={10} className="flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-slate-900/60 flex items-center gap-2">
            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-500 hover:bg-white/10 transition disabled:opacity-40"
              title="Share file"
            >
              <Paperclip size={14} />
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={uploadingFile ? "Uploading file..." : "Type a message..."}
              disabled={uploadingFile}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || uploadingFile}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition disabled:opacity-45"
            >
              <Send size={14} />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}

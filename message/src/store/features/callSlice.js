import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  state: 'idle', // idle, calling, incoming, ringing, connected, ended
  caller: null,
  receiver: null,
  callType: null,
  roomId: null,
  callId: null,
  startedAt: null,
  duration: 0,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setCalling: (s, a) => ({ ...s, state: 'calling', ...a.payload }),
    setIncoming: (s, a) => ({ ...s, state: 'incoming', ...a.payload }),
    setRinging: (s, a) => ({ ...s, state: 'ringing', ...a.payload }),
    setConnected: (s, a) => ({ ...s, state: 'connected', startedAt: a.payload.startedAt || new Date(), ...a.payload }),
    setEnded: (s, a) => ({ ...s, state: 'ended', duration: a.payload?.duration || 0, ...a.payload }),
    resetCall: () => ({ ...initialState }),
    updateDuration: (s, a) => ({ ...s, duration: a.payload }),
  },
});

export const { setCalling, setIncoming, setRinging, setConnected, setEnded, resetCall, updateDuration } = callSlice.actions;
export default callSlice.reducer;

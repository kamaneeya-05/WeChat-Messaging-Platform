export function createPeerConnection({ onTrack, onIceCandidate, onConnectionStateChange } = {}) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) onIceCandidate(event.candidate);
  };

  pc.ontrack = (event) => {
    if (onTrack) onTrack(event.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    if (onConnectionStateChange) onConnectionStateChange(pc.connectionState);
  };

  return pc;
}

export async function createOffer(pc, localStream, options = {}) {
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
  const offer = await pc.createOffer(options);
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc, localStream) {
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function applyRemoteDescription(pc, sdp) {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

export async function addIceCandidate(pc, candidate) {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn('Failed to add ICE Candidate', err);
  }
}

export function replaceTrack(pc, oldTrack, newTrack) {
  try {
    const senders = pc.getSenders();
    const sender = senders.find((s) => s.track && s.track.id === oldTrack.id);
    if (sender) sender.replaceTrack(newTrack);
  } catch (err) {
    console.warn('replaceTrack failed', err);
  }
}

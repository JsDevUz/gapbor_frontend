class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.callId = null;
    this.isCallActive = false;
    
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  }

  async getUserMedia(constraints = null) {
    try {
      // Agar constraints berilmagan bo'lsa, default qilib o'rnatish
      if (!constraints) {
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
      }

      console.log('Getting user media with constraints:', constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stream tracks ni tekshirish
      console.log('Local stream tracks:', this.localStream.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted
      })));
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  createPeerConnection() {
    console.log('Creating peer connection...');
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated:', event.candidate);
        this.socket.emit('call:ice-candidate', {
          receiverId: this.remoteUserId,
          callId: this.callId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Remote stream received:', event.streams[0]);
      console.log('Remote stream tracks:', event.streams[0].getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted
      })));
      
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Local stream tracks ni peer connection ga qo'shish
    if (this.localStream) {
      console.log('Adding local tracks to peer connection');
      this.localStream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track:`, track.label);
        this.peerConnection.addTrack(track, this.localStream);
      });
    } else {
      console.warn('No local stream available when creating peer connection');
    }
  }

  async initiateCall(receiverId, callerInfo) {
    try {
      this.remoteUserId = receiverId;
      this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('calling',receiverId);
      
      await this.getUserMedia();
      this.createPeerConnection();

      // Only send initiate signal, wait for answer
      this.socket.emit('call:initiate', {
        callerId: callerInfo.id,
        receiverId,
        callerName: callerInfo.name,
        callerPic: callerInfo.pic,
        callId: this.callId
      });
console.log('call:initiate qilindi yuboruvchidan');

      return { callId: this.callId };
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  async handleIncomingCall(callData) {
    this.callId = callData.callId;
    this.remoteUserId = callData.callerId;
    this.callerInfo = {
      id: callData.callerId,
      name: callData.callerName,
      pic: callData.callerPic
    };
    console.log('onIncomingCall ga');
    
    this.onIncomingCall(callData);
  }

  async acceptCall() {
    try {
      await this.getUserMedia();
      this.createPeerConnection();
      this.isCallActive = true;

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('call:offer', {
        receiverId: this.remoteUserId,
        callId: this.callId,
        offer
      });

    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  async handleOffer(offerData) {
    try {
      console.log('Handling offer:', offerData);
      
      if (!this.peerConnection) {
        await this.getUserMedia();
        this.createPeerConnection();
      }

      // RemoteUserId ni o'rnatish kerak (agar yo'q bo'lsa)
      if (!this.remoteUserId && offerData.callerId) {
        this.remoteUserId = offerData.callerId;
      }

      console.log('Setting remote description');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      
      console.log('Creating answer');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('Sending answer');
      this.socket.emit('call:answer', {
        receiverId: this.remoteUserId,
        callId: this.callId,
        answer
      });

      this.isCallActive = true;

      // Saqlangan ICE candidatelarni qo'shish
      if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
        console.log('Adding pending ICE candidates');
        for (const candidate of this.pendingIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate.candidate));
          } catch (error) {
            console.error('Error adding pending ICE candidate:', error);
          }
        }
        this.pendingIceCandidates = [];
      }

    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answerData) {
    try {
      console.log('Handling answer:', answerData);
      
      // Agar peerConnection bo'lmasa, yaratamiz
      if (!this.peerConnection) {
        await this.getUserMedia();
        this.createPeerConnection();
      }
      
      console.log('Setting remote description from answer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      this.isCallActive = true;

      // Saqlangan ICE candidatelarni qo'shish
      if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
        console.log('Adding pending ICE candidates after answer');
        for (const candidate of this.pendingIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate.candidate));
          } catch (error) {
            console.error('Error adding pending ICE candidate:', error);
          }
        }
        this.pendingIceCandidates = [];
      }

    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidateData) {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
      } else {
        // Remote description hali o'rnatilmagan bo'lsa, ICE candidatelarni saqlab qo'yamiz
        this.pendingIceCandidates = this.pendingIceCandidates || [];
        this.pendingIceCandidates.push(candidateData);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  rejectCall() {
    this.socket.emit('call:reject', {
      receiverId: this.remoteUserId,
      callId: this.callId
    });
    this.cleanup();
  }

  endCall() {
    if (this.isCallActive) {
      this.socket.emit('call:end', {
        receiverId: this.remoteUserId,
        callId: this.callId
      });
    }
    this.cleanup();
  }

  cleanup() {
    this.isCallActive = false;
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.callId = null;
    this.remoteUserId = null;
    this.callerInfo = null;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  cleanup() {
    console.log('Cleaning up WebRTC service');
    
    // Local stream ni to'xtatish
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Peer connection ni yopish
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Remote stream ni tozalash
    this.remoteStream = null;

    // State ni tozalash
    this.remoteUserId = null;
    this.callId = null;
    this.isCallActive = false;
    this.pendingIceCandidates = [];

    console.log('WebRTC service cleaned up');
  }

  // Event callbacks
  onIncomingCall = (callData) => {};
  onRemoteStream = (stream) => {};
  onCallEnded = () => {};
  onCallRejected = () => {};
}

export default WebRTCService;

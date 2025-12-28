// Constants
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const DEFAULT_MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.callId = null;
    this.isCallActive = false;
    this.remoteUserId = null;
    this.callerInfo = null;
    this.pendingIceCandidates = [];
  }

  async getUserMedia(constraints = null) {
    try {
      const mediaConstraints = constraints || DEFAULT_MEDIA_CONSTRAINTS;
      this.localStream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );

      // Agar track disabled bo'lsa, enable qilish
      this.localStream.getTracks().forEach((track) => {
        if (!track.enabled) {
          track.enabled = true;
        }
      });

      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.remoteUserId && this.callId) {
        this.socket.emit("call:ice-candidate", {
          receiverId: this.remoteUserId,
          callId: this.callId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
    };

    // Local stream tracks ni peer connection ga qo'shish
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  async initiateCall(receiverId, callerInfo) {
    try {
      // Agar oldingi call bo'lsa, uni tozalash
      if (this.isCallActive || this.peerConnection || this.localStream) {
        this.cleanup();
      }

      this.remoteUserId = receiverId;
      this.callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await this.getUserMedia();
      this.createPeerConnection();

      this.socket.emit("call:initiate", {
        callerId: callerInfo.id,
        receiverId,
        callerName: callerInfo.name,
        callerPic: callerInfo.pic,
        callId: this.callId,
      });

      return { callId: this.callId };
    } catch (error) {
      console.error("Error initiating call:", error);
      throw error;
    }
  }

  async handleIncomingCall(callData) {
    this.callId = callData.callId;
    this.remoteUserId = callData.callerId;
    this.callerInfo = {
      id: callData.callerId,
      name: callData.callerName,
      pic: callData.callerPic,
    };
    this.onIncomingCall(callData);
  }

  async acceptCall() {
    try {
      // Agar oldingi call bo'lsa, uni tozalash
      if (this.peerConnection || this.localStream) {
        this.cleanup();
      }

      await this.getUserMedia();
      this.createPeerConnection();
      this.isCallActive = true;

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit("call:offer", {
        receiverId: this.remoteUserId,
        callId: this.callId,
        offer,
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      throw error;
    }
  }

  async handleOffer(offerData) {
    try {
      // Agar oldingi connection bo'lsa, uni tozalash
      if (this.peerConnection) {
        this.cleanup();
      }

      if (!this.peerConnection) {
        await this.getUserMedia();
        this.createPeerConnection();
      }

      // RemoteUserId ni o'rnatish kerak (agar yo'q bo'lsa)
      if (!this.remoteUserId && offerData.callerId) {
        this.remoteUserId = offerData.callerId;
      }

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerData.offer)
      );

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit("call:answer", {
        receiverId: this.remoteUserId,
        callId: this.callId,
        answer,
      });

      this.isCallActive = true;
      this._addPendingIceCandidates();
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  async handleAnswer(answerData) {
    try {
      // Agar peerConnection bo'lmasa, yaratamiz
      if (!this.peerConnection) {
        await this.getUserMedia();
        this.createPeerConnection();
      }

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answerData.answer)
      );
      this.isCallActive = true;
      this._addPendingIceCandidates();
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }

  _addPendingIceCandidates() {
    if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
      for (const candidate of this.pendingIceCandidates) {
        try {
          this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate.candidate)
          );
        } catch (error) {
          console.error("Error adding pending ICE candidate:", error);
        }
      }
      this.pendingIceCandidates = [];
    }
  }

  async handleIceCandidate(candidateData) {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidateData.candidate)
        );
      } else {
        // Remote description hali o'rnatilmagan bo'lsa, ICE candidatelarni saqlab qo'yamiz
        this.pendingIceCandidates = this.pendingIceCandidates || [];
        this.pendingIceCandidates.push(candidateData);
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  }

  rejectCall() {
    this.socket.emit("call:reject", {
      receiverId: this.remoteUserId,
      callId: this.callId,
    });
    // Reject qilganda ham state ni tozalash
    this.cleanup();
  }

  endCall() {
    if (this.isCallActive) {
      this.socket.emit("call:end", {
        receiverId: this.remoteUserId,
        callId: this.callId,
      });
    }
    this.cleanup();
  }

  cleanup() {
    // Local stream ni to'xtatish
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Peer connection ni yopish
    if (this.peerConnection) {
      // Event handlerlarni tozalash
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Remote stream ni tozalash
    this.remoteStream = null;

    // Barcha state ni tozalash
    this.remoteUserId = null;
    this.callId = null;
    this.isCallActive = false;
    this.pendingIceCandidates = [];
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

  // Event callbacks
  onIncomingCall = (callData) => {};
  onRemoteStream = (stream) => {};
  onCallEnded = () => {};
  onCallRejected = () => {};
}

export default WebRTCService;

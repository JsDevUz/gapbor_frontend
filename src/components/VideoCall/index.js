import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import WebRTCService from "../../services/webrtc.service";
import {
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiPhone,
  FiPhoneIncoming,
} from "react-icons/fi";
import useModal from "hooks/useModal";

const VideoCallContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 90%;
  max-width: 1200px;
  height: 70vh;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: 80vh;
  }
`;

const VideoWrapper = styled.div`
  position: relative;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoLabel = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 14px;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  backdrop-filter: blur(10px);
`;

const ControlButton = styled.button`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 20px;

  &:hover {
    transform: scale(1.1);
  }

  ${(props) =>
    props.variant === "video" &&
    `
    background: ${props.active ? "#4CAF50" : "#f44336"};
    color: white;
  `}

  ${(props) =>
    props.variant === "audio" &&
    `
    background: ${props.active ? "#4CAF50" : "#f44336"};
    color: white;
  `}
  
  ${(props) =>
    props.variant === "end" &&
    `
    background: #f44336;
    color: white;
  `}
  
  ${(props) =>
    props.variant === "answer" &&
    `
    background: #4CAF50;
    color: white;
  `}
  
  ${(props) =>
    props.variant === "reject" &&
    `
    background: #f44336;
    color: white;
  `}
`;

const IncomingCallModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  text-align: center;
  min-width: 300px;
`;

const CallerInfo = styled.div`
  margin-bottom: 20px;

  img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-bottom: 10px;
  }

  h3 {
    margin: 10px 0 5px 0;
    color: #333;
  }

  p {
    color: #666;
    margin: 0;
  }
`;

const CallButtons = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
`;

const VideoCall = ({
  socket,
  currentUser,
  targetUser,
  onClose,
  incomingCall,
  webrtcService: externalWebrtcService,
}) => {
  const [isInCall, setIsInCall] = useState(false);
  const { setChats, setToast, chats, selectChat, setSelectChat } = useModal();

  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcService = useRef(null);

  // Agar incomingCall da isInCall true bo'lsa, UI ni yangilaymiz
  useEffect(() => {
    if (incomingCall && incomingCall.isInCall) {
      setIsInCall(true);
      setIsIncomingCall(false);
    }
  }, [incomingCall]);

  // WebRTC service event handlers
  const setupWebRTCService = (service) => {
    service.onIncomingCall = (callData) => {
      setCallerInfo({
        callerId: callData.callerId,
        callerName: callData.callerName,
        callerPic: callData.callerPic,
      });
      setIsIncomingCall(true);
    };

    service.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    service.onCallEnded = () => {
      handleEndCall();
    };

    service.onCallRejected = () => {
      setIsIncomingCall(false);
      setCallerInfo(null);
    };
  };

  useEffect(() => {
    // Agar tashqi WebRTC service bo'lsa, uni ishlat, aks holda yangi yarat
    if (externalWebrtcService) {
      webrtcService.current = externalWebrtcService;
      setupWebRTCService(externalWebrtcService);
    } else if (socket && !webrtcService.current) {
      webrtcService.current = new WebRTCService(socket);
      setupWebRTCService(webrtcService.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, externalWebrtcService]);

  useEffect(() => {
    // Local video ni o'rnatish
    if (isInCall && localVideoRef.current && webrtcService.current) {
      const stream = webrtcService.current.localStream;
      if (stream) {
        localVideoRef.current.srcObject = stream;

        // Track holatini UI ga sinxronizatsiya qilish
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
          setIsVideoEnabled(videoTrack.enabled);
        }
        if (audioTrack) {
          setIsAudioEnabled(audioTrack.enabled);
        }
      }
    }
  }, [isInCall]);

  useEffect(() => {
    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    // Agar incomingCall bo'lsa, uni WebRTC service ga uzatish
    if (!incomingCall || !webrtcService.current) return;

    // Agar offer bor bo'lsa, bu offer-received signal
    if (incomingCall.offer) {
      webrtcService.current.handleOffer(incomingCall);
      setIsInCall(true);
    } else if (incomingCall.answered) {
      // Bu call:answered signal - yuboruvchi tomondan javob keldi
      setIsInCall(true);
    } else {
      // Bu call:incoming signal
      setCallerInfo({
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        callerPic: incomingCall.callerPic,
      });
      setIsIncomingCall(true);
      webrtcService.current.handleIncomingCall(incomingCall);
    }
  }, [incomingCall]);

  const getMediaErrorMessage = (error) => {
    const errorMessages = {
      NotAllowedError:
        "Kamera yoki mikrofon ruxsati berilmagan. Iltimos, brauzer sozlamalaridan ruxsat bering.",
      NotFoundError:
        "Kamera yoki mikrofon topilmadi. Iltimos, qurilmalarni ulang.",
      NotReadableError:
        "Kamera yoki mikrofon boshqa ilova tomonidan ishlatilmoqda.",
      OverconstrainedError: "Qurilma talablarga mos kelmadi.",
      TypeError: "HTTPS ulanish talab qilinadi. Iltimos, HTTPS orqali ulaning.",
    };
    return errorMessages[error.name] || error.message;
  };

  const handleInitiateCall = async (receiverId) => {
    try {
      // Media qurilmalari mavjudligini tekshirish
      if (!navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        } catch (mediaError) {
          throw new Error(
            "Kamera yoki mikrofon ruxsati kerak. Iltimos, HTTPS orqali ulaning yoki brauzer sozlamalaridan ruxsat bering."
          );
        }
      }

      setIsWaitingForAnswer(true);
      await webrtcService.current.initiateCall(receiverId, {
        id: currentUser._id,
        name: currentUser.fullName,
        pic: currentUser.pic,
      });
    } catch (error) {
      setToast({
        toast: true,
        text: getMediaErrorMessage(error),
      });
      console.error("Error initiating call:", error);
      setIsWaitingForAnswer(false);
    }
  };

  const handleAcceptCall = async () => {
    try {
      await webrtcService.current.acceptCall();
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleAnswer = async (answerData) => {
    try {
      await webrtcService.current.handleAnswer(answerData);
      setIsInCall(true);
      setIsWaitingForAnswer(false);
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  const handleRejectCall = () => {
    if (webrtcService.current) {
      webrtcService.current.rejectCall();
    }
    setIsWaitingForAnswer(false);
    setIsIncomingCall(false);
    setCallerInfo(null);
    onClose();
  };

  const handleEndCall = () => {
    if (webrtcService.current) {
      webrtcService.current.endCall();
    }
    setIsInCall(false);
    setIsIncomingCall(false);
    setIsWaitingForAnswer(false);
    setCallerInfo(null);
    onClose();
  };

  const toggleVideo = () => {
    if (webrtcService.current) {
      const enabled = webrtcService.current.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcService.current) {
      const enabled = webrtcService.current.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  if (isIncomingCall && callerInfo) {
    return (
      <IncomingCallModal>
        <CallerInfo>
          <img src={callerInfo.callerPic} alt={callerInfo.callerName} />
          <h3>{callerInfo.callerName}</h3>
          <p>Video call...</p>
        </CallerInfo>
        <CallButtons>
          <ControlButton variant="answer" onClick={handleAcceptCall}>
            <FiPhoneIncoming />
          </ControlButton>
          <ControlButton variant="reject" onClick={handleRejectCall}>
            <FiPhone />
          </ControlButton>
        </CallButtons>
      </IncomingCallModal>
    );
  }

  // Agar targetUser bo'lsa va call boshlanmagan bo'lsa, call boshlash tugmasini ko'rsatish
  if (targetUser && !isIncomingCall && !isInCall && !isWaitingForAnswer) {
    return (
      <VideoCallContainer>
        <div style={{ textAlign: "center", color: "white" }}>
          <h3>Ready to call {targetUser.fullName}</h3>
          <CallButtons>
            <ControlButton
              variant="answer"
              onClick={() => handleInitiateCall(targetUser._id)}
            >
              <FiVideo />
            </ControlButton>
            <ControlButton variant="reject" onClick={onClose}>
              <FiPhone />
            </ControlButton>
          </CallButtons>
        </div>
      </VideoCallContainer>
    );
  }

  // Agar javob kutilayotgan bo'lsa
  if (isWaitingForAnswer && !isInCall) {
    return (
      <VideoCallContainer>
        <div style={{ textAlign: "center", color: "white" }}>
          <h3>Calling {targetUser.fullName}...</h3>
          <p>Waiting for answer...</p>
          <CallButtons>
            <ControlButton variant="reject" onClick={handleEndCall}>
              <FiPhone />
            </ControlButton>
          </CallButtons>
        </div>
      </VideoCallContainer>
    );
  }

  if (isInCall) {
    return (
      <VideoCallContainer>
        <VideoGrid>
          <VideoWrapper>
            <VideoElement ref={localVideoRef} autoPlay muted playsInline />
            <VideoLabel>You</VideoLabel>
          </VideoWrapper>
          <VideoWrapper>
            <VideoElement ref={remoteVideoRef} autoPlay playsInline />
            <VideoLabel>{callerInfo?.callerName || "Remote"}</VideoLabel>
          </VideoWrapper>
        </VideoGrid>
        <ControlsContainer>
          <ControlButton
            variant="video"
            active={isVideoEnabled}
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
          </ControlButton>
          <ControlButton
            variant="audio"
            active={isAudioEnabled}
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <FiMic /> : <FiMicOff />}
          </ControlButton>
          <ControlButton variant="end" onClick={handleEndCall}>
            <FiPhone />
          </ControlButton>
        </ControlsContainer>
      </VideoCallContainer>
    );
  }

  return null;
};

export default VideoCall;

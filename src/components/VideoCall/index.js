import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import WebRTCService from '../../services/webrtc.service';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhone, FiPhoneIncoming } from 'react-icons/fi';
import useModal from 'hooks/useModal';

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
  
  ${props => props.variant === 'video' && `
    background: ${props.active ? '#4CAF50' : '#f44336'};
    color: white;
  `}
  
  ${props => props.variant === 'audio' && `
    background: ${props.active ? '#4CAF50' : '#f44336'};
    color: white;
  `}
  
  ${props => props.variant === 'end' && `
    background: #f44336;
    color: white;
  `}
  
  ${props => props.variant === 'answer' && `
    background: #4CAF50;
    color: white;
  `}
  
  ${props => props.variant === 'reject' && `
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

const VideoCall = ({ socket, currentUser, targetUser, onClose, incomingCall, webrtcService: externalWebrtcService }) => {
  const [isInCall, setIsInCall] = useState(false);
  const { setChats, setToast, chats, selectChat, setSelectChat } = useModal();
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  console.log('Is iOS device:', isIOS);
  
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

  useEffect(() => {
    console.log(externalWebrtcService,socket,webrtcService.current);
    
    // Agar tashqi WebRTC service bo'lsa, uni ishlat, aks holda yangi yarat
    if (externalWebrtcService) {
      console.log('externalWebrtcService qisimi');
      
      webrtcService.current = externalWebrtcService;
      
      // Tashqi WebRTC service uchun event handlers o'rnatish
      externalWebrtcService.onIncomingCall = (callData) => {
        console.log('onIncomingCall kelllldi');
        
        setCallerInfo({
          callerId: callData.callerId,
          callerName: callData.callerName,
          callerPic: callData.callerPic
        });
        setIsIncomingCall(true);
      };
      
      externalWebrtcService.onRemoteStream = (stream) => {
        console.log('Remote stream received in VideoCall:', stream);
        console.log('Remote stream tracks:', stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted
        })));
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          
          // iPhone uchun video elementni majburan play qilish
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            remoteVideoRef.current.play().catch(error => {
              console.error('Error playing remote video on iOS:', error);
              // iOS da user interaction talab qilinishi mumkin
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().catch(e => console.log('Still error:', e));
            });
          }
        }
      };
      
      externalWebrtcService.onCallEnded = () => {
        handleEndCall();
      };
      
      externalWebrtcService.onCallRejected = () => {
        setIsIncomingCall(false);
        setCallerInfo(null);
      };
    } else if (socket && !webrtcService.current) {
      console.log('woriking');
      
      webrtcService.current = new WebRTCService(socket);
      console.log(webrtcService.current);
      
      // WebRTC event handlers
      webrtcService.current.onIncomingCall = (callData) => {
        console.log('onIncomingCall keldi');
        
        setCallerInfo(callData);
        setIsIncomingCall(true);
      };
      
      webrtcService.current.onRemoteStream = (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };
      
      webrtcService.current.onCallEnded = () => {
        handleEndCall();
      };
      
      webrtcService.current.onCallRejected = () => {
        setIsIncomingCall(false);
        setCallerInfo(null);
      };

      // Socket event listeners
      socket.on('call:incoming', (data) => {
        console.log('call:incoming yetib keldi clientga',data);
        
        webrtcService.current.handleIncomingCall(data);
      });
      
      socket.on('call:offer-received', (data) => {
        console.log('call:offer-received yetib keldi clientga',data);
        
        webrtcService.current.handleOffer(data);
      });
      
      socket.on('call:answered', (data) => {
        handleAnswer(data);
      });
      
      socket.on('call:ice-candidate', (data) => {
        webrtcService.current.handleIceCandidate(data);
      });
      
      socket.on('call:ended', (data) => {
        handleEndCall();
      });
      
      socket.on('call:rejected', (data) => {
        handleRejectCall();
      });
    }
  }, [socket, externalWebrtcService]);

  useEffect(() => {
    // Local video ni o'rnatish
    if (isInCall && localVideoRef.current && webrtcService.current) {
      const stream = webrtcService.current.localStream;
      if (stream) {
        console.log('Setting local video stream:', stream);
        console.log('Local stream tracks:', stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted
        })));
        
        localVideoRef.current.srcObject = stream;
        
        // iPhone uchun local video elementni majburan play qilish
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          localVideoRef.current.play().catch(error => {
            console.error('Error playing local video on iOS:', error);
            // iOS da user interaction talab qilinishi mumkin
            localVideoRef.current.muted = true; // Local video odatda muted bo'ladi
            localVideoRef.current.play().catch(e => console.log('Still error:', e));
          });
        }
        
        // Track holatini UI ga sinxronizatsiya qilish
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack) {
          setIsVideoEnabled(videoTrack.enabled);
          console.log('Video track enabled:', videoTrack.enabled);
        }
        if (audioTrack) {
          setIsAudioEnabled(audioTrack.enabled);
          console.log('Audio track enabled:', audioTrack.enabled);
        }
      }
    }
  }, [isInCall, webrtcService.current]);

  useEffect(() => {
    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    // Agar incomingCall bo'lsa, uni WebRTC service ga uzatish
    if (incomingCall && webrtcService.current) {
      // Agar offer bor bo'lsa, bu offer-received signal
      if (incomingCall.offer) {
        console.log('offer-received signal qabul qilinyapti');
        webrtcService.current.handleOffer(incomingCall);
        setIsInCall(true); // Call boshlandi
      } else if (incomingCall.answered) {
        // Bu call:answered signal - yuboruvchi tomondan javob keldi
        console.log('call:answered signal qabul qilinyapti');
        setIsInCall(true); // Qabul qiluvchi tomonida call boshlandi
      } else {
        // Bu call:incoming signal
        setCallerInfo({
          callerId: incomingCall.callerId,
          callerName: incomingCall.callerName,
          callerPic: incomingCall.callerPic
        });
        setIsIncomingCall(true);
        
        // WebRTC service ga uzatish
        webrtcService.current.handleIncomingCall(incomingCall);
      }
    }
  }, [incomingCall]);

  const handleInitiateCall = async (receiverId) => {
    console.log('receiverId',receiverId,'currentUser',currentUser,"o'rtasida aloqa o'rnatish boshlandi");
    
    try {
      // Media qurilmalari mavjudligini tekshirish
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // HTTP da ishlash uchun vaqtinchalik yechim
        console.warn('Media qurilmalari HTTP da cheklangan. HTTPS tavsiya etiladi.');
        
        // getUserMedia ni chaqirishga harakat qilish
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaError) {
          throw new Error("Kamera yoki mikrofon ruxsati kerak. Iltimos, HTTPS orqali ulaning yoki brauzer sozlamalaridan ruxsat bering.");
        }
      }
      
      setIsWaitingForAnswer(true);
      const result = await webrtcService.current.initiateCall(receiverId, {
        id: currentUser._id,
        name: currentUser.fullName,
        pic: currentUser.pic
      });
      console.log('muvoffaqatli yuborildi yuboruvchidan');
      
    } catch (error) {
      let errorMessage = error.message;
      
      // Media qurilmalari xatoliklarini aniqlash
      if (error.name === 'NotAllowedError') {
        errorMessage = "Kamera yoki mikrofon ruxsati berilmagan. Iltimos, brauzer sozlamalaridan ruxsat bering.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Kamera yoki mikrofon topilmadi. Iltimos, qurilmalarni ulang.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Kamera yoki mikrofon boshqa ilova tomonidan ishlatilmoqda.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Qurilma talablarga mos kelmadi.";
      } else if (error.name === 'TypeError') {
        errorMessage = "HTTPS ulanish talab qilinadi. Iltimos, https://192.168.100.253:5443 orqali ulaning.";
      }
      
      setToast({
        toast: true,
        text: errorMessage,
      });
      console.error('Error initiating call:', error);
      setIsWaitingForAnswer(false);
    }
  };
  
  const handleAcceptCall = async () => {
    try {
      await webrtcService.current.acceptCall();
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };
  
  const handleAnswer = async (answerData) => {
    try {
      await webrtcService.current.handleAnswer(answerData);
      setIsInCall(true);
      setIsWaitingForAnswer(false);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleRejectCall = () => {
    if (webrtcService.current) {
      webrtcService.current.rejectCall();
      webrtcService.current.cleanup(); // WebRTC service ni tozalash
    }
    setIsWaitingForAnswer(false);
    setIsIncomingCall(false);
    setCallerInfo(null);
    onClose();
  };
    
  const handleEndCall = () => {
    if (webrtcService.current) {
      webrtcService.current.endCall();
      webrtcService.current.cleanup(); // WebRTC service ni tozalash
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
      console.log('Video toggled to:', enabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcService.current) {
      const enabled = webrtcService.current.toggleAudio();
      setIsAudioEnabled(enabled);
      console.log('Audio toggled to:', enabled);
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
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h3>Ready to call {targetUser.fullName}</h3>
           {isIOS && <p style={{ color: '#ffcc00', fontSize: '14px' }}>ios</p>}
          <CallButtons>
            <ControlButton variant="answer" onClick={() => handleInitiateCall(targetUser._id)}>
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
        <div style={{ textAlign: 'center', color: 'white' }}>
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
            <VideoElement
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
            />
            <VideoLabel>You</VideoLabel>
          </VideoWrapper>
          <VideoWrapper>
            <VideoElement
              ref={remoteVideoRef}
              autoPlay
              playsInline
            />
            <VideoLabel>{callerInfo?.callerName || 'Remote'}</VideoLabel>
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


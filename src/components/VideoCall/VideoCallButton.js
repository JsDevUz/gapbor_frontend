import React, { useState } from 'react';
import styled from 'styled-components';
import { FiVideo } from 'react-icons/fi';
import VideoCall from './index';

const CallButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #45a049;
    transform: scale(1.1);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const VideoCallButton = ({ socket, currentUser, targetUser, disabled, webrtcService }) => {
  const [showCall, setShowCall] = useState(false);

  const handleStartCall = () => {
    setShowCall(true);
  };

  const handleCloseCall = () => {
    setShowCall(false);
  };

  return (
    <>
      <CallButton
        onClick={handleStartCall}
        disabled={disabled || !targetUser}
        title="Start video call"
      >
        <FiVideo size={18} />
      </CallButton>
    
      {showCall && (
        <VideoCall
          socket={socket}
          currentUser={currentUser}
          targetUser={targetUser}
          onClose={handleCloseCall}
          webrtcService={webrtcService}
        />
      )}
    </>
  );
};

export default VideoCallButton;

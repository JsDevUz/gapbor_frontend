import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getKey } from 'services/storage';
import { socket } from 'services/socket';
import useGetMe from 'hooks/useGetMe';
import useModal from 'hooks/useModal';
import MeetVideoCall from 'components/MeetVideoCall';
import { FiUsers, FiCopy, FiShare2, FiX } from 'react-icons/fi';

const MeetPage = () => {
  const { meetId } = useParams();
  const navigate = useNavigate();
  const { getMe } = useGetMe();
  const { setAlert, setToast } = useModal();
  
  const [meet, setMeet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showVideoCall, setShowVideoCall] = useState(false);
console.log(isCreator,joinRequests);

  // Meet ma'lumotlarini olish
  useEffect(() => {
    const fetchMeetInfo = async () => {
      try {
        const token = getKey("token");
        console.log('Current user ID:', getMe?._id);
        console.log('Socket connected:', socket.connected,socket);
        
        const response = await fetch(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/${meetId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (result.success) {
          setMeet(result.meet);
          
          // Creator ekanligini tekshirish
          const userId = getMe?._id;
          setIsCreator(result.meet.creator._id === userId);
          
          // Agar user allaqachon participant bo'lsa, video call ni ko'rsatish
          if (result.meet.participants.some(p => p._id === userId)) {
            setShowVideoCall(true);
          }
        } else {
          setAlert(result.message || "Meet topilmadi", "error");
          navigate('/chats/all');
        }
      } catch (error) {
        console.error('Meet info error:', error);
        setAlert("Meet ma'lumotlarini olishda xatolik", "error");
        navigate('/chats/all');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetInfo();
  }, [meetId, getMe, navigate, setAlert]);

  // Socket event listeners
  useEffect(() => {
    if (!meet) return;

    const userId = getMe?._id;

    // Join request received (creator uchun)
    const handleJoinRequest = (data) => {
      console.log('Join request received in frontend:', data,meetId);
      if (data.meetId === meetId) {
        setJoinRequests(prev => [...prev, data]);
        setToast(`${data.user.fullName} meet ga qo'shilishni so'rayapti`, "info");
      }
    };

    // Join approved (user uchun)
    const handleJoinApproved = (data) => {
      console.log('Join approved received in MeetPage:', data);
      if (data.meetId === meetId && data.approved) {
        setShowVideoCall(true);
        
        setToast("Meet ga qo'shildingiz!", "success");
      }
    };

    // User joined
    const handleUserJoined = (data) => {
      if (data.user._id !== userId) {
        setToast(`${data.user.fullName} meet ga qo'shildi`, "success");
      }
    };

    // User left
    const handleUserLeft = (data) => {
      setToast("Foydalanuvchi meet dan chiqdi", "info");
    };

    // Meet ended
    const handleMeetEnded = () => {
      setAlert("Meet tugatildi", "info");
      navigate('/chats/all');
    };

    socket.on('meet:join-request-received', handleJoinRequest);
    socket.on('meet:join-approved', handleJoinApproved);
    socket.on('meet:user-joined', handleUserJoined);
    socket.on('meet:user-left', handleUserLeft);
    socket.on('meet:ended', handleMeetEnded);

    console.log('Socket listeners added for meet:', meetId);
    console.log('Socket connected:', socket.connected);

    return () => {
      socket.off('meet:join-request-received', handleJoinRequest);
      socket.off('meet:join-approved', handleJoinApproved);
      socket.off('meet:user-joined', handleUserJoined);
      socket.off('meet:user-left', handleUserLeft);
      socket.off('meet:ended', handleMeetEnded);
    };
  }, [meet, meetId, getMe, navigate, setAlert, setToast]);

  // Meet ga qo'shilish so'rovi
  const handleJoinRequest = async () => {
    try {
      const token = getKey("token");
      const userId = getMe?._id;

      console.log('Sending join request:', { meetId, userId });

      // Backend ga join request
      const response = await fetch(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/${meetId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();
      console.log('Join request API response:', result);

      if (result.success) {
        // Socket orqali join request yuborish
        socket.emit('meet:join-request', {
          meetId,
          userId
        }, (response) => {
          console.log('Socket join request response:', response);
        });

        setAlert("Qo'shilish so'rovi yuborildi. Creator tasdiqlashini kuting...", "info");
      } else {
        setAlert(result.message || "Qo'shilishda xatolik", "error");
      }
    } catch (error) {
      console.error('Join request error:', error);
      setAlert("Qo'shilish so'rovini yuborishda xatolik", "error");
    }
  };

  // Join request ni tasdiqlash (creator uchun)
  const handleApproveRequest = async (request) => {
    try {
      const token = getKey("token");
      const creatorId = getMe?._id;

      // Backend ga approve request
      const response = await fetch(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/${meetId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: request.user.id,
          creatorId,
          userSocketId: request.socketId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Socket orqali approve yuborish
        socket.emit('meet:approve-request', {
          meetId,
          userId: request.user.id,
          creatorId,
          userSocketId: request.socketId
        });

        // Join requests dan olib tashlash
        setJoinRequests(prev => prev.filter(req => req.socketId !== request.socketId));
        
        setAlert(`${request.user.fullName} qo'shilishiga ruxsat berildi`, "success");
      } else {
        setAlert(result.message || "Ruxsat berishda xatolik", "error");
      }
    } catch (error) {
      console.error('Approve request error:', error);
      setAlert("Ruxsat berishda xatolik", "error");
    }
  };

  // Meet ni tugatish (creator uchun)
  const handleEndMeet = async () => {
    try {
      const token = getKey("token");
      const userId = getMe?._id;

      const response = await fetch(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/${meetId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        // Socket orqali meet tugatish
        socket.emit('meet:end', {
          meetId,
          userId
        });

        navigate('/chats/all');
      } else {
        setAlert(result.message || "Meet ni tugatishda xatolik", "error");
      }
    } catch (error) {
      console.error('End meet error:', error);
      setAlert("Meet ni tugatishda xatolik", "error");
    }
  };

  // Link nusxalash
  const handleCopyLink = () => {
    const meetLink = `${window.location.origin}/meet/${meetId}`;
    navigator.clipboard.writeText(meetLink);
    setAlert("Link nusxalandi!", "success");
  };

  // Meet dan chiqish
  const handleLeaveMeet = () => {
    socket.emit('meet:leave', {
      meetId,
      userId: getMe?._id
    });
    navigate('/chats/all');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  if (!meet) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div>Meet topilmadi</div>
      </div>
    );
  }

  // Video call ko'rsatilganda
  if (showVideoCall) {
    return (
      <MeetVideoCall
        socket={socket}
        currentUser={getMe}
        onClose={handleLeaveMeet}
        meetId={meetId}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#333' }}>{meet.title}</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>{meet.description}</p>
            <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: '14px' }}>
              Meet ID: {meetId}
            </p>
          </div>
          <button
            onClick={handleLeaveMeet}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '5px',
              backgroundColor: '#dc3545',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <FiX /> Chiqish
          </button>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px'
        }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FiCopy /> Link nusxalash
          </button>

          {isCreator && (
            <button
              onClick={handleEndMeet}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Meet ni tugatish
            </button>
          )}
        </div>

        {/* Participants */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#333' }}>
            <FiUsers /> Qatnashchilar ({meet.participants.length})
          </h3>
          <div style={{ marginTop: '10px' }}>
            {meet.participants.map(participant => (
              <div key={participant._id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px',
                marginBottom: '5px'
              }}>
                <img 
                  src={participant.pic} 
                  alt={participant.fullName}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <span>{participant.fullName}</span>
                {participant._id === meet.creator._id && (
                  <span style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px'
                  }}>
                    Creator
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>{isCreator}</div>fdfd

        {/* Join requests (creator uchun) */}
        {isCreator && joinRequests.length > 0 && (
          <div>
            fdfd
            <h3 style={{ color: '#333' }}>Qo'shilish so'rovlari ({joinRequests.length})</h3>
            <div style={{ marginTop: '10px' }}>
              {joinRequests.map(request => (
                <div key={request.socketId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '5px',
                  marginBottom: '5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={request.user.pic} 
                      alt={request.user.fullName}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                    <span>{request.user.fullName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleApproveRequest(request)}
                      style={{
                        padding: '5px 10px',
                        border: 'none',
                        borderRadius: '3px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Qabul qil
                    </button>
                    <button
                      onClick={() => setJoinRequests(prev => prev.filter(req => req.socketId !== request.socketId))}
                      style={{
                        padding: '5px 10px',
                        border: 'none',
                        borderRadius: '3px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Rad et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join button (participant bo'lmasa) */}
        {!meet.participants.some(p => p._id === getMe?._id) && !isCreator && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleJoinRequest}
              style={{
                padding: '15px 30px',
                border: 'none',
                borderRadius: '5px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Meet ga qo'shilish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetPage;

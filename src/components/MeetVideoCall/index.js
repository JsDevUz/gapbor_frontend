import React, { useState, useEffect, useRef } from "react";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhone,
  FiUsers,
  FiUserPlus,
} from "react-icons/fi";
import useModal from "hooks/useModal";

const MeetVideoCall = ({ socket, currentUser, onClose, meetId }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [joinRequests, setJoinRequests] = useState([]);
  const [isCreator, setIsCreator] = useState(false);

  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const remoteTracks = useRef({}); // Tracklarni saqlash uchun
  const { setToast } = useModal();

  // Local stream olish
  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("Local stream obtained:", stream);
      console.log(
        "Local stream tracks:",
        stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted,
        }))
      );
      setLocalStream(stream);
      localStreamRef.current = stream;

      // Local video elementga stream o'rnatish
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Local video element updated");
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  useEffect(() => {
    getLocalStream();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Local stream o'zgarganda local video elementga o'rnatish
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      console.log("Local video element updated in useEffect");
    }
  }, [localStream]);

  // Participants o'zgarganda peer connection yaratish
  // Faqat o'z ID si kichikroq bo'lgan user offer yaratadi (glare condition oldini olish uchun)
  useEffect(() => {
    console.log(
      "Participants useEffect triggered:",
      participants.length,
      participants
    );
    if (participants.length > 0 && localStreamRef.current && currentUser) {
      participants.forEach((participant) => {
        if (
          participant._id !== currentUser._id &&
          !peerConnections.current[participant._id]
        ) {
          console.log("Creating PC and offer for participant:", participant);
          createPeerConnection(participant._id, participant);
        }
      });
    }
  }, [participants, currentUser]);

  // Join request ni tasdiqlash
  const handleApproveRequest = async (request) => {
    try {
      console.log("Approve request clicked:", request);
      const token = localStorage.getItem("token");

      // Backend ga approve request
      const response = await fetch(
        `${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/${meetId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: request.user.id,
            creatorId: currentUser?._id,
            userSocketId: request.socketId,
          }),
        }
      );

      const result = await response.json();
      console.log("Approve request API response:", result);

      if (result.success) {
        // Socket orqali approve yuborish
        socket.emit("meet:approve-request", {
          meetId,
          userId: request.user.id,
          creatorId: currentUser?._id,
          userSocketId: request.socketId,
        });
        console.log("Approve request socket emitted");

        // Join requests dan olib tashlash
        setJoinRequests((prev) =>
          prev.filter((req) => req.socketId !== request.socketId)
        );

        setToast(
          `${request.user.fullName} qo'shilishiga ruxsat berildi`,
          "success"
        );
      } else {
        setToast(result.message || "Ruxsat berishda xatolik", "error");
      }
    } catch (error) {
      console.error("Approve request error:", error);
      setToast("Ruxsat berishda xatolik", "error");
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !meetId) return;

    const userId = currentUser?._id;

    // Socket ulangandan keyin listeners qo'shish
    const setupListeners = () => {
      // Join request received (creator uchun)
      const handleJoinRequest = (data) => {
        console.log("Join request received in MeetVideoCall:", data);
        if (data.meetId === meetId) {
          setJoinRequests((prev) => [...prev, data]);
          setToast(
            `${data.user.fullName} meet ga qo'shilishni so'rayapti`,
            "info"
          );
        }
      };

      // Join approved (user uchun)
      const handleJoinApproved = (data) => {
        console.log("Join approved received in MeetVideoCall:", data);
        if (data.meetId === meetId && data.approved) {
          // Creator ga peer connection yaratish
          console.log("Creating peer connection for creator after approval");
          // Creator ID ni bilishimiz kerak
          // Bu ma'lumot serverdan kelishi kerak
        }
      };

      socket.on("meet:join-approved", handleJoinApproved);

      // Yangi user qo'shilganda
      const handleUserJoined = (data) => {
        console.log("🔵 meet:user-joined received:", data);
        console.log("Current userId:", userId);
        console.log("Current participants before:", participants);
        if (data.userId !== userId) {
          console.log("Creating peer connection for:", data.userId);
          setParticipants((prev) => {
            // Avval bu user allaqachon borligini tekshirish
            const exists = prev.some((p) => p._id === data.userId);
            if (!exists) {
              return [...prev, data.user];
            }
            return prev;
          });
          // Agar peer connection mavjud bo'lsa, eski connectionni tozalash (refresh case)
          if (peerConnections.current[data.userId]) {
            console.log(
              "User rejoined, cleaning up existing peer connection for:",
              data.userId
            );
            peerConnections.current[data.userId].close();
            delete peerConnections.current[data.userId];
            // Eski remote streamni ham tozalash
            setRemoteStreams((prev) => {
              const newStreams = { ...prev };
              delete newStreams[data.userId];
              return newStreams;
            });
          }
          // Yangi peer connection yaratish
          createPeerConnection(data.userId, data.user);
        } else {
          // O'zimiz ham peer connection yaratishimiz kerak
          console.log(
            "This is me, creating peer connection for existing users"
          );

          // O'zimizni participants listiga qo'shish
          setParticipants((prev) => {
            const exists = prev.some((p) => p._id === userId);
            if (!exists) {
              return [...prev, currentUser];
            }
            return prev;
          });

          // Local video elementga stream o'rnatish (yangi user uchun)
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            console.log("Local video element updated for new user");
          }

          // Existing users uchun peer connection yaratish - useEffect qiladi
          // Shu yerda qilmaymiz, chunki useEffect avtomatik qiladi
        }
      };

      // User chiqqanda
      const handleUserLeft = (data) => {
        console.log("User left the meet:", data.userId);
        setParticipants((prev) => prev.filter((p) => p._id !== data.userId));

        // Peer connection ni tozalash
        if (peerConnections.current[data.userId]) {
          console.log("Closing peer connection for user:", data.userId);
          peerConnections.current[data.userId].close();
          delete peerConnections.current[data.userId];
        }

        // Tracklarni tozalash
        delete remoteTracks.current[data.userId];

        setRemoteStreams((prev) => {
          const newStreams = { ...prev };
          delete newStreams[data.userId];
          return newStreams;
        });
      };

      // WebRTC signal eventlari
      const handleOffer = async (data) => {
        console.log("meet:offer received in client:", data);
        try {
          let pc = peerConnections.current[data.fromUserId];
          if (!pc) {
            console.log(
              "No peer connection found, creating new one for:",
              data.fromUserId
            );
            // Peer connection yaratish (offer yubormay)
            await createPeerConnection(
              data.fromUserId,
              {
                _id: data.fromUserId,
                fullName: "User",
                pic: "",
              },
              false
            );
            pc = peerConnections.current[data.fromUserId];
          }

          if (pc) {
            console.log("Peer connection found for:", data.fromUserId);
            console.log("handleOffer: Before setRemoteDescription (offer):");
            console.log("  Signaling State:", pc.signalingState);
            console.log("  Remote Description:", pc.remoteDescription);

            // Perfect negotiation: handle glare condition
            const hasLocalOffer = pc.signalingState === "have-local-offer";
            const isPolite = currentUser._id > data.fromUserId; // Higher ID is more polite

            if (hasLocalOffer && isPolite) {
              console.log(
                "Glare detected! We're polite, ignoring remote offer and restarting negotiation"
              );
              // As the polite peer, ignore the remote offer and restart with our offer after a delay
              setTimeout(async () => {
                console.log("Polite peer restarting negotiation");
                // Close current PC
                pc.close();
                delete peerConnections.current[data.fromUserId];
                setRemoteStreams((prev) => {
                  const newStreams = { ...prev };
                  delete newStreams[data.fromUserId];
                  return newStreams;
                });
                // Create new offer
                await createPeerConnection(
                  data.fromUserId,
                  {
                    _id: data.fromUserId,
                    fullName: "User",
                    pic: "",
                  },
                  true
                );
              }, 1000); // Wait 1 second before restarting
              return;
            }

            if (hasLocalOffer && !isPolite) {
              console.log(
                "Glare detected! We're impolite, ignoring remote offer and waiting for polite peer to restart"
              );
              // As the impolite peer, ignore the remote offer
              // The polite peer will restart negotiation
              return;
            }

            await pc.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            console.log("handleOffer: After setRemoteDescription (offer):");
            console.log("  Signaling State:", pc.signalingState);
            console.log("  Remote Description:", pc.remoteDescription);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("handleOffer: After setLocalDescription (answer):");
            console.log("  Signaling State:", pc.signalingState);
            console.log("  Local Description:", pc.localDescription);

            socket.emit("meet:answer", {
              meetId,
              toUserId: data.fromUserId,
              fromUserId: userId,
              answer,
            });
            console.log("Answer sent to:", data.fromUserId);
          } else {
            console.log(
              "Failed to create peer connection for:",
              data.fromUserId
            );
          }
        } catch (error) {
          console.error("Error handling offer:", error);
        }
      };

      const handleAnswer = async (data) => {
        console.log("meet:answer received in client:", data);
        console.log(
          "Answer SDP type:",
          new RTCSessionDescription(data.answer).type
        );
        try {
          const pc = peerConnections.current[data.fromUserId];
          if (pc) {
            console.log("Current signaling state:", pc.signalingState);
            console.log("Setting remote description for:", data.fromUserId);

            console.log(
              "Current remoteDescription type:",
              pc.remoteDescription?.type
            );

            // The offerer can set remote answer when in 'have-local-offer' state,
            // or when 'stable' but remote description is still 'offer' (late answer arrival)
            console.log("Evaluating condition:");
            console.log("  signalingState:", pc.signalingState);
            console.log(
              "  remoteDescription?.type:",
              pc.remoteDescription?.type
            );
            console.log(
              "  Condition 1 (have-local-offer):",
              pc.signalingState === "have-local-offer"
            );
            console.log(
              "  Condition 2 (stable + offer):",
              pc.signalingState === "stable" &&
                pc.remoteDescription?.type === "offer"
            );

            if (
              pc.signalingState === "have-local-offer" ||
              (pc.signalingState === "stable" &&
                pc.remoteDescription?.type === "offer")
            ) {
              console.log("Setting remote description to answer...");
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
              console.log("Remote description set successfully to answer.");
              console.log(
                "After setting answer - Signaling State:",
                pc.signalingState
              );
              console.log(
                "After setting answer - Remote Description:",
                pc.remoteDescription
              );

              // Queued ICE candidate larni qo'shish
              if (pc.iceCandidatesQueue && pc.iceCandidatesQueue.length > 0) {
                console.log(
                  `Processing ${pc.iceCandidatesQueue.length} queued ICE candidates for ${data.fromUserId}`
                );
                let addedCount = 0;
                for (const candidate of pc.iceCandidatesQueue) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(
                      `Queued ICE candidate added: ${candidate.type}`
                    );
                    addedCount++;
                  } catch (addIceError) {
                    console.error(
                      "Error adding queued ICE candidate:",
                      addIceError
                    );
                  }
                }
                pc.iceCandidatesQueue = [];
                console.log(
                  `Successfully added ${addedCount} queued ICE candidates for ${data.fromUserId}`
                );
              } else {
                console.log(`No queued ICE candidates for ${data.fromUserId}`);
              }
            } else {
              console.warn(
                "Cannot set remote description for answer in state:",
                pc.signalingState,
                "for",
                data.fromUserId
              );
              // If the state is not 'have-local-offer', we assume the answer was already processed or
              // there is a negotiation issue. We still need to process ICE candidates.
            }
          } else {
            console.log(
              "No peer connection found for answer:",
              data.fromUserId
            );
          }
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      };

      const handleIceCandidate = async (data) => {
        console.log(
          `meet:ice-candidate received from ${data.fromUserId}:`,
          data.candidate?.type,
          data.candidate?.protocol,
          data.candidate?.address
        );
        try {
          const pc = peerConnections.current[data.fromUserId];
          if (pc && data.candidate) {
            console.log("Adding ICE candidate for:", data.fromUserId);
            console.log(
              "Current remote description:",
              pc.remoteDescription?.type
            );
            console.log("Current signaling state:", pc.signalingState);

            // Remote description bo'lgandagina ICE candidate qo'shish mumkin
            console.log("Checking remote description for ICE candidate:");
            console.log(
              "  pc.remoteDescription exists:",
              !!pc.remoteDescription
            );
            console.log(
              "  pc.remoteDescription.type:",
              pc.remoteDescription?.type
            );

            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log(
                  `ICE candidate added successfully for ${data.fromUserId}:`,
                  data.candidate.type
                );
              } catch (addIceError) {
                console.error("Error adding ICE candidate:", addIceError);
              }
            } else {
              console.warn(
                "Cannot add ICE candidate - no remote description yet, queuing candidate"
              );
              // ICE candidate larni saqlash uchun queue
              if (!pc.iceCandidatesQueue) {
                pc.iceCandidatesQueue = [];
              }
              pc.iceCandidatesQueue.push(data.candidate);
              console.log(
                `Queued ICE candidate for ${data.fromUserId}, queue length:`,
                pc.iceCandidatesQueue.length
              );
            }
          } else {
            console.log("No PC or candidate for:", data.fromUserId);
          }
        } catch (error) {
          console.error("Error handling ICE candidate:", error);
        }
      };

      socket.on("meet:join-request-received", handleJoinRequest);
      socket.on("meet:user-joined", handleUserJoined);
      socket.on("meet:user-left", handleUserLeft);
      socket.on("meet:offer", handleOffer);
      socket.on("meet:answer", handleAnswer);
      socket.on("meet:ice-candidate", handleIceCandidate);

      console.log("MeetVideoCall socket listeners added for meet:", meetId);

      // Meet roomiga qo'shilish
      console.log(
        "Emitting meet:join-room for meetId:",
        meetId,
        "userId:",
        userId
      );
      socket.emit("meet:join-room", { meetId, userId }, (response) => {
        console.log("meet:join-room response:", response);
      });
      console.log("Joined meet room:", meetId);

      // User ni online users ga qo'shish
      socket.emit("user:connected", userId);
      console.log("User connected:", userId);

      return () => {
        socket.off("meet:join-request-received", handleJoinRequest);
        socket.off("meet:user-joined", handleUserJoined);
        socket.off("meet:user-left", handleUserLeft);
        socket.off("meet:offer", handleOffer);
        socket.off("meet:answer", handleAnswer);
        socket.off("meet:ice-candidate", handleIceCandidate);

        // Barcha peer connectionlarni yopish
        Object.values(peerConnections.current).forEach((pc) => pc.close());
        peerConnections.current = {};

        // Barcha tracklarni tozalash
        remoteTracks.current = {};
      };
    };

    if (socket.connected) {
      return setupListeners();
    } else {
      const handleConnect = () => {
        console.log("Socket connected, setting up listeners");
        setupListeners();
        socket.off("connect", handleConnect);
      };

      socket.on("connect", handleConnect);
      return () => {
        socket.off("connect", handleConnect);
      };
    }
  }, [socket, meetId, currentUser]);

  // Peer connection yaratish
  const createPeerConnection = async (userId, user, sendOffer = true) => {
    try {
      console.log("Creating peer connection for user:", userId);

      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          // Add TURN servers for better connectivity
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
        iceCandidatePoolSize: 10,
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnections.current[userId] = pc;
      console.log("Peer connection created for:", userId);

      // Add connection timeout handling
      let connectionTimeout = setTimeout(() => {
        if (
          pc.connectionState !== "connected" &&
          pc.connectionState !== "completed"
        ) {
          console.warn(
            `Connection timeout for ${userId}, restarting ICE gathering`
          );
          pc.restartIce();
        }
      }, 10000); // 10 second timeout

      // Clear timeout on successful connection
      const clearConnectionTimeout = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      };

      // Override the connection state change handler to clear timeout
      const originalOnConnectionStateChange = pc.onconnectionstatechange;
      pc.onconnectionstatechange = () => {
        if (originalOnConnectionStateChange) originalOnConnectionStateChange();

        if (
          pc.connectionState === "connected" ||
          pc.connectionState === "completed"
        ) {
          clearConnectionTimeout();
        }
      };

      // Local stream qo'shish
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
        console.log("Local stream added to peer connection");
      }

      // Remote stream qabul qilish
      pc.ontrack = (event) => {
        console.log(
          `Remote track received from ${userId}:`,
          event.track.kind,
          event.track.readyState
        );
        console.log("Track streams:", event.streams.length);

        const stream = event.streams[0];
        if (stream) {
          console.log(
            `Setting remote stream for user ${userId}, tracks:`,
            stream.getTracks().map((t) => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
            }))
          );
          setRemoteStreams((prev) => ({
            ...prev,
            [userId]: stream,
          }));
        } else {
          console.warn(`No stream in track event from ${userId}`);
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(
            `ICE candidate generated for ${userId}:`,
            event.candidate.type,
            event.candidate.protocol,
            event.candidate.address || "no-address"
          );

          // Check if we have any non-host candidates (STUN/TURN working)
          if (event.candidate.type !== "host") {
            console.log(
              `✅ Got ${event.candidate.type} candidate for ${userId} - good for connectivity`
            );
          } else {
            console.log(
              `⚠️ Got host candidate for ${userId} - may need STUN/TURN for remote connection`
            );
          }

          socket.emit("meet:ice-candidate", {
            meetId,
            toUserId: userId,
            fromUserId: currentUser?._id,
            candidate: event.candidate,
          });
        } else {
          console.log(`ICE gathering completed for ${userId}`);
          const sdp = pc.localDescription?.sdp;
          if (sdp) {
            const candidateLines = sdp
              .split("\n")
              .filter((line) => line.startsWith("a=candidate:"));
            const hostCandidates = candidateLines.filter((line) =>
              line.includes("typ host")
            ).length;
            const srflxCandidates = candidateLines.filter((line) =>
              line.includes("typ srflx")
            ).length;
            const relayCandidates = candidateLines.filter((line) =>
              line.includes("typ relay")
            ).length;

            console.log(`Candidate summary for ${userId}:`);
            console.log(`  Host: ${hostCandidates}`);
            console.log(`  Server Reflexive (STUN): ${srflxCandidates}`);
            console.log(`  Relay (TURN): ${relayCandidates}`);
          }
        }
      };

      // ICE connection state monitoring
      pc.oniceconnectionstatechange = () => {
        console.log(
          `ICE connection state for ${userId} changed to: ${pc.iceConnectionState}`
        );

        // Additional debugging for different states
        if (pc.iceConnectionState === "checking") {
          console.log(`ICE checking started for ${userId}`);
        } else if (pc.iceConnectionState === "connected") {
          console.log(`ICE connected for ${userId} - media should flow now`);
        } else if (pc.iceConnectionState === "completed") {
          console.log(`ICE completed for ${userId}`);
        } else if (pc.iceConnectionState === "failed") {
          console.error(`ICE failed for ${userId} - connection won't work`);
          console.error(`ICE gathering state: ${pc.iceGatheringState}`);
          console.error(
            `Local candidates count: ${
              pc.localDescription?.sdp?.split("a=candidate:").length - 1 || 0
            }`
          );

          // Try to restart ICE as a last resort
          console.log(`Attempting ICE restart for ${userId}`);
          try {
            pc.restartIce();
          } catch (error) {
            console.error(`ICE restart failed for ${userId}:`, error);
          }
        } else if (pc.iceConnectionState === "disconnected") {
          console.warn(`ICE disconnected for ${userId} - temporary issue`);
        }
      };

      // ICE gathering state monitoring
      pc.onicegatheringstatechange = () => {
        console.log(
          `ICE gathering state for ${userId} changed to: ${pc.iceGatheringState}`
        );

        if (pc.iceGatheringState === "complete") {
          console.log(`ICE gathering completed for ${userId}`);
          const candidateCount =
            pc.localDescription?.sdp?.split("a=candidate:").length - 1 || 0;
          console.log(
            `Total ICE candidates generated for ${userId}: ${candidateCount}`
          );
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(
          "Connection state for",
          userId,
          "changed to:",
          pc.connectionState
        );
        console.log("Local Description:", pc.localDescription);
        console.log("Remote Description:", pc.remoteDescription);
        console.log("Signaling State:", pc.signalingState);
        console.log("ICE Connection State:", pc.iceConnectionState);

        if (pc.connectionState === "failed") {
          console.error(
            "Connection failed for",
            userId,
            "checking ICE state:",
            pc.iceConnectionState
          );
          console.error("ICE gathering state:", pc.iceGatheringState);
          console.error("Signaling state:", pc.signalingState);
          console.error("Local description:", pc.localDescription?.type);
          console.error("Remote description:", pc.remoteDescription?.type);

          // Check if we have any ICE candidates
          console.error(
            "ICE candidates generated:",
            pc.iceGatheringState === "complete" ? "Yes" : "No"
          );

          // NO MORE RESTART - just log the error
          console.error("Connection failed - no restart attempt");
        }
      };

      // Offer yuborish (faqat sendOffer true bo'lsa)
      if (sendOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Local Description after setLocalDescription (offer):");
        console.log(pc.localDescription);
        console.log("Offer created and set for:", userId);

        socket.emit("meet:offer", {
          meetId,
          toUserId: userId,
          fromUserId: currentUser?._id,
          offer,
        });
        console.log("Offer sent to:", userId);
      }
    } catch (error) {
      console.error("Peer connection yaratishda xatolik:", error);
    }
  };

  // Audio toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Video toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Remote streamlar o'zgarganda video elementlarni yangilash
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      const videoEl = remoteVideoRefs.current[userId];
      if (videoEl && stream) {
        console.log(`Updating video element for user ${userId}:`, {
          currentSrcObject: videoEl.srcObject,
          newStream: stream,
          tracks: stream.getTracks().map((t) => ({
            kind: t.kind,
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
          })),
        });

        // Streamni o'rnatish (har safar, chunki stream yangilanishi mumkin)
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          console.log(`Stream set for video element ${userId}`);
        }

        // Tracklarni enable qilish
        stream.getTracks().forEach((track) => {
          if (!track.enabled) {
            track.enabled = true;
            console.log(`Enabled ${track.kind} track for user ${userId}`);
          }
        });

        // Video muted bo'lishi kerak emas (faqat local video muted bo'ladi)
        videoEl.muted = false;

        // Video play qilishni ta'minlash
        videoEl
          .play()
          .then(() => {
            console.log(`Video playing for user ${userId}`);
          })
          .catch((error) => {
            console.error(
              `Error playing remote video for user ${userId}:`,
              error
            );
          });
      } else if (videoEl && !stream) {
        // Agar stream yo'q bo'lsa, srcObject ni tozalash
        console.log(`Clearing video element for user ${userId}`);
        videoEl.srcObject = null;
      }
    });
  }, [remoteStreams]);

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#2c3e50",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FiUsers />
          <span>Meet ID: {meetId}</span>
          <span>({participants.length + 1} participants)</span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={toggleAudio}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: isAudioEnabled ? "#27ae60" : "#e74c3c",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {isAudioEnabled ? <FiMic /> : <FiMicOff />}
            {isAudioEnabled ? "Audio" : "Audio Off"}
          </button>

          <button
            onClick={toggleVideo}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: isVideoEnabled ? "#27ae60" : "#e74c3c",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
            {isVideoEnabled ? "Video" : "Video Off"}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: "#e74c3c",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <FiPhone />
            Leave
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: participants.length > 0 ? "1fr 1fr" : "1fr",
          gap: "10px",
          padding: "10px",
          backgroundColor: "#1a1a1a",
          position: "relative",
        }}
      >
        {/* Join requests (creator uchun) */}
        {joinRequests.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              backgroundColor: "rgba(0,0,0,0.8)",
              borderRadius: "10px",
              padding: "10px",
              minWidth: "250px",
              zIndex: 10,
            }}
          >
            <h4
              style={{ color: "white", margin: "0 0 10px 0", fontSize: "14px" }}
            >
              <FiUserPlus /> Qo'shilish so'rovlari ({joinRequests.length})
            </h4>
            {joinRequests.map((request) => (
              <div
                key={request.socketId}
                style={{
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "5px",
                  padding: "8px",
                  marginBottom: "5px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <img
                    src={request.user.pic}
                    alt={request.user.fullName}
                    style={{
                      width: "25px",
                      height: "25px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                    {request.user.fullName}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleApproveRequest(request)}
                    style={{
                      padding: "4px 8px",
                      border: "none",
                      borderRadius: "3px",
                      backgroundColor: "#28a745",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "10px",
                    }}
                  >
                    Qabul qil
                  </button>
                  <button
                    onClick={() =>
                      setJoinRequests((prev) =>
                        prev.filter((req) => req.socketId !== request.socketId)
                      )
                    }
                    style={{
                      padding: "4px 8px",
                      border: "none",
                      borderRadius: "3px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "10px",
                    }}
                  >
                    Rad et
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Local Video */}
        <div
          style={{
            backgroundColor: "#2c3e50",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
            aspectRatio: "16/9",
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "5px 10px",
              borderRadius: "5px",
              fontSize: "12px",
            }}
          >
            {currentUser?.fullName} (You)
          </div>
        </div>

        {/* Remote Videos */}
        {console.log("Current remoteStreams:", remoteStreams)}
        {console.log("Current participants:", participants)}
        {Object.entries(remoteStreams).map(([userId, stream]) => {
          const participant = participants.find((p) => p._id === userId);
          console.log(
            "Rendering remote video for:",
            userId,
            stream,
            participant
          );
          return (
            <div
              key={userId}
              style={{
                backgroundColor: "#2c3e50",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
                aspectRatio: "16/9",
              }}
            >
              <video
                autoPlay
                playsInline
                ref={(videoEl) => {
                  if (videoEl) {
                    remoteVideoRefs.current[userId] = videoEl;
                    // Streamni video elementga o'rnatish
                    if (stream) {
                      videoEl.srcObject = stream;
                      console.log(
                        "Remote video srcObject set for user:",
                        userId
                      );
                    }
                  }
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                }}
              >
                {participant?.fullName || `User ${userId.slice(-6)}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeetVideoCall;

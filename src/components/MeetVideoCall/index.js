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
  const iceCandidateQueue = useRef({}); // ICE candidates ni saqlash uchun
  const videoPlayTimeouts = useRef({}); // Track video play timeouts to prevent multiple attempts
  const { setToast } = useModal();

  // Local stream olish
  const getLocalStream = async () => {
    try {
      // Audio priority constraints - audio eng yuqori sifatda, video adaptiv
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
          latency: { ideal: 0.01, max: 0.03 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

      // Audio trackni priority qilish
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        // Audio trackni high priority qilish
        audioTrack.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
        });
        console.log("Audio track optimized for quality");
      }

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
  useEffect(() => {
    console.log(
      "Participants useEffect triggered:",
      participants.length,
      participants
    );

    // Creator har doim participants listda bo'lishi kerak
    if (isCreator && currentUser) {
      const creatorInList = participants.some((p) => p._id === currentUser._id);
      if (!creatorInList) {
        console.log("Creator adding self to participants");
        setParticipants((prev) => [...prev, currentUser]);
        return; // Return to allow the useEffect to run again with updated participants
      }
    }

    // Only creator creates peer connections proactively
    if (isCreator && localStreamRef.current && currentUser) {
      participants.forEach((participant) => {
        if (
          participant._id !== currentUser._id &&
          !peerConnections.current[participant._id]
        ) {
          console.log(
            "Creator creating PC and offer for participant:",
            participant
          );
          createPeerConnection(participant._id, participant, true);
        }
      });
    }
  }, [participants, currentUser, isCreator]);

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
          // Only creator creates peer connections proactively
          if (isCreator) {
            // Agar peer connection mavjud bo'lsa, eski connectionni tozalash (refresh case)
            if (peerConnections.current[data.userId]) {
              console.log(
                "Creator: User rejoined, cleaning up existing peer connection for:",
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
            // Creator creates peer connection and sends offer
            console.log(
              "Creator creating peer connection for new user:",
              data.userId
            );
            createPeerConnection(data.userId, data.user, true);
          }
        } else {
          // O'zimiz - hech narsa qilmaymiz, chunki creator allaqachon participants listiga qo'yilgan
          console.log(
            "This is me, not adding to participants (already handled by creator)"
          );

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

        // Clear video play timeout
        if (videoPlayTimeouts.current[data.userId]) {
          clearTimeout(videoPlayTimeouts.current[data.userId]);
          delete videoPlayTimeouts.current[data.userId];
        }
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

                // Clear video play timeout
                if (videoPlayTimeouts.current[data.fromUserId]) {
                  clearTimeout(videoPlayTimeouts.current[data.fromUserId]);
                  delete videoPlayTimeouts.current[data.fromUserId];
                }
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

            await pc.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            console.log("Remote description set successfully");

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("Answer created and set");

            socket.emit("meet:answer", {
              meetId,
              toUserId: data.fromUserId,
              fromUserId: currentUser?._id,
              answer,
            });
            console.log("Answer sent to:", data.fromUserId);

            // Queued ICE candidates ni qo'shish
            const queuedCandidates =
              iceCandidateQueue.current[data.fromUserId] || [];
            console.log(
              "Adding queued ICE candidates:",
              queuedCandidates.length
            );
            for (const candidate of queuedCandidates) {
              try {
                await pc.addIceCandidate(candidate);
                console.log("Added queued ICE candidate");
              } catch (error) {
                console.error("Error adding queued ICE candidate:", error);
              }
            }
            iceCandidateQueue.current[data.fromUserId] = [];
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
              "Current remote description:",
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

            // Answer faqat have-local-offer state da qo'yilishi mumkin
            if (pc.signalingState === "have-local-offer") {
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
              const queuedCandidates =
                iceCandidateQueue.current[data.fromUserId] || [];
              if (queuedCandidates.length > 0) {
                console.log(
                  `Processing ${queuedCandidates.length} queued ICE candidates for ${data.fromUserId}`
                );
                let addedCount = 0;
                for (const candidate of queuedCandidates) {
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
                iceCandidateQueue.current[data.fromUserId] = [];
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
              console.log(
                "This answer might be a duplicate or from a completed negotiation"
              );
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
              if (!iceCandidateQueue.current[data.fromUserId]) {
                iceCandidateQueue.current[data.fromUserId] = [];
              }
              iceCandidateQueue.current[data.fromUserId].push(data.candidate);
              console.log(
                `Queued ICE candidate for ${data.fromUserId}, queue length:`,
                iceCandidateQueue.current[data.fromUserId].length
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

        // Creator status ni o'rnatish
        if (response.isCreator === true) {
          setIsCreator(true);
          console.log("✅ User is creator");
        } else {
          setIsCreator(false);
          console.log("❌ User is NOT creator");
        }

        // Serverdan participants ma'lumotini olish (refresh case uchun)
        if (response.isOk) {
          console.log(
            "Join room successful, waiting for participants from server..."
          );
          // Serverdan meet:user-joined eventlari keladi, ular participants state ni to'ldiradi
          // 2 soniya kutib, agar participants bo'sh bo'lsa, creator reconnection signal yuboramiz
          setTimeout(() => {
            if (participants.length === 0) {
              console.log(
                "No participants received, checking if creator needs to reconnect"
              );
              // Agar creator bo'lsa va participants yo'q bo'lsa, bu yangi meet
              // Agar creator bo'lsa va participants bor bo'lsa, ular serverdan kelishi kerak
            } else if (isCreator && participants.length > 0) {
              console.log(
                "Creator detected with participants, signaling reconnection"
              );
              participants.forEach((participant) => {
                if (participant._id !== userId) {
                  console.log(
                    "Creator reconnecting to participant:",
                    participant._id
                  );
                  createPeerConnection(participant._id, participant, true);
                }
              });
            }
          }, 2000); // 2 soniya kutish, serverdan participants kelishi uchun
        }
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

        // Clear all video play timeouts
        Object.values(videoPlayTimeouts.current).forEach((timeout) => {
          if (timeout) clearTimeout(timeout);
        });
        videoPlayTimeouts.current = {};
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
        // Audio priority settings
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnections.current[userId] = pc;
      console.log("Peer connection created for:", userId);

      // Connection timeout olib tashlandi - u signaling ni buzardi
      // ICE gathering natural way da ishlaydi

      // Local stream qo'shish
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          // Audio trackni high priority qilish
          if (track.kind === "audio") {
            pc.addTrack(track, localStreamRef.current);
            console.log("Audio track added with high priority");
          } else if (track.kind === "video") {
            // Video trackni adaptiv qilish
            pc.addTrack(track, localStreamRef.current);

            // Video quality monitoring va adaptation
            const sender = pc.getSenders().find((s) => s.track === track);
            if (sender) {
              // Network monitoring uchun
              const monitorConnection = () => {
                if (pc.connectionState === "connected") {
                  // Internet yomon bo'lsa video sifatini tushirish
                  const stats = pc.getStats();
                  stats.then((report) => {
                    report.forEach((stat) => {
                      if (
                        stat.type === "outbound-rtp" &&
                        stat.kind === "video"
                      ) {
                        // Agar packet loss yuqori bo'lsa, video sifatini tushir
                        if (stat.packetsLost > 0 && stat.packetsSent > 0) {
                          const lossRate = stat.packetsLost / stat.packetsSent;
                          if (lossRate > 0.05) {
                            // 5% dan ortiq packet loss
                            console.log(
                              "High packet loss detected, reducing video quality"
                            );
                            sender
                              .setParameters({
                                encoding: [
                                  {
                                    scaleResolutionDownBy: 2, // 2x ga kichiktirish
                                    maxBitrate: 300000, // 300kbps max
                                  },
                                ],
                              })
                              .catch((e) =>
                                console.log(
                                  "Failed to reduce video quality:",
                                  e
                                )
                              );
                          }
                        }
                      }
                    });
                  });
                }
              };

              // Har 5 sekundda network monitoring
              setInterval(monitorConnection, 5000);
            }
            console.log("Video track added with adaptive quality");
          }
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
          // ICE connected bo'lsa, connection failed deb hisoblamaslik
          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            console.warn(
              "Connection state shows failed but ICE is connected - treating as success for",
              userId
            );
            console.warn(
              "ICE state:",
              pc.iceConnectionState,
              "Connection state:",
              pc.connectionState
            );
            // Media flow qilayotgan bo'lsa, hech narsa qilmaymiz
            return;
          }

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
        } else if (pc.connectionState === "connected") {
          console.log("✅ Connection successfully established for", userId);
          console.log(
            "ICE state:",
            pc.iceConnectionState,
            "Connection state:",
            pc.connectionState
          );
        }
      };

      // Offer yuborish (faqat sendOffer true bo'lsa)
      if (sendOffer) {
        // State ni tekshirish - agar remote offer bo'lsa, offer yubormaymiz
        if (pc.signalingState === "have-remote-offer") {
          console.log(
            "Cannot create offer - already have remote offer, will create answer instead"
          );
          return; // Answer handleOffer da yaratiladi
        }

        // Additional state checks
        if (pc.signalingState !== "stable") {
          console.log(
            `Cannot create offer - signaling state is ${pc.signalingState}, not stable`
          );
          return;
        }

        console.log("Creating offer for user:", userId);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: true,
        });

        // Double-check state before setting local description
        if (pc.signalingState !== "stable") {
          console.log(
            `Cannot set local description - signaling state changed to ${pc.signalingState}`
          );
          return;
        }

        // SDP parsing xatoliklardan saqlanish uchun soddaroq usul
        // Faqat audio codec priority qilamiz, FMTP parametrlarsiz
        const sdp = offer.sdp;

        // Audio codec priority: Opus (111) ni birinchi o'ringa qo'yish
        const audioPrioritySdp = sdp.replace(
          /m=audio (\d+) UDP\/TLS\/RTP\/SAVPF (.*)/,
          (match, port, codecs) => {
            const codecList = codecs.split(" ");
            const opusIndex = codecList.indexOf("111");
            if (opusIndex > 0) {
              codecList.splice(opusIndex, 1);
              codecList.unshift("111");
            }
            return `m=audio ${port} UDP/TLS/RTP/SAVPF ${codecList.join(" ")}`;
          }
        );

        offer.sdp = audioPrioritySdp;

        await pc.setLocalDescription(offer);
        console.log("Local Description after setLocalDescription (offer):");
        console.log(pc.localDescription);
        console.log("Audio-prioritized offer created and set for:", userId);

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

        // Video muted bo'lishi kerak (auto-play policy uchun)
        videoEl.muted = true;

        // Audio ni alohida handled qilish - audio element yaratish
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          // Audio element yaratish (agar mavjud bo'lmasa)
          let audioEl = document.getElementById(`remote-audio-${userId}`);
          if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = `remote-audio-${userId}`;
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            // Audio element hidden bo'lishi kerak
            audioEl.style.display = "none";
            document.body.appendChild(audioEl);
            console.log(`Created audio element for user ${userId}`);
          }

          // Audio stream ni o'rnatish
          const audioStream = new MediaStream([audioTrack]);
          audioEl.srcObject = audioStream;

          // Audio elementni play qilish
          audioEl
            .play()
            .then(() => {
              console.log(`Audio playing for user ${userId}`);
            })
            .catch((error) => {
              console.log(
                `Audio auto-play blocked for user ${userId}, will play on interaction`
              );
            });
        }

        // Video play qilishni ta'minlash - interruptiondan saqlanish uchun
        const playVideo = async () => {
          try {
            // Check if video element and stream are valid
            if (!videoEl || !stream) {
              console.log(
                `Cannot play video for user ${userId}: missing videoEl or stream`
              );
              return;
            }

            // Check if video is already playing to avoid unnecessary play calls
            if (!videoEl.paused && !videoEl.ended && videoEl.readyState >= 3) {
              console.log(`Video already playing for user ${userId}`);
              return;
            }

            // Ensure video is muted for autoplay policy
            videoEl.muted = true;

            // Only play if stream has tracks and is active
            if (stream.active && stream.getTracks().length > 0) {
              console.log(`Attempting to play video for user ${userId}`);
              await videoEl.play();
              console.log(`✅ Video playing for user ${userId}`);
            } else {
              console.log(
                `Stream not ready for user ${userId}: active=${
                  stream.active
                }, tracks=${stream.getTracks().length}`
              );
            }
          } catch (error) {
            if (error.name === "NotAllowedError") {
              console.log(
                `Auto-play blocked for user ${userId}, video will play on user interaction`
              );
              // User interaction kutish uchun event listener qo'shish
              const enableVideoOnInteraction = () => {
                videoEl.play().catch((e) => {
                  console.log(
                    `Video play failed after interaction for user ${userId}:`,
                    e
                  );
                });
                // Event listener larni olib tashlash
                document.removeEventListener("click", enableVideoOnInteraction);
                document.removeEventListener(
                  "keydown",
                  enableVideoOnInteraction
                );
              };

              // User interaction listeners
              document.addEventListener("click", enableVideoOnInteraction, {
                once: true,
              });
              document.addEventListener("keydown", enableVideoOnInteraction, {
                once: true,
              });
            } else if (error.name === "AbortError") {
              console.log(
                `Video play interrupted for user ${userId}, retrying...`
              );
              // Qisqa vaqtdan keyin qayta urinish
              setTimeout(() => {
                videoEl.play().catch((e) => {
                  console.log(
                    `Video play failed completely for user ${userId}:`,
                    e
                  );
                });
              }, 100);
            } else {
              console.error(
                `Error playing remote video for user ${userId}:`,
                error
              );
            }
          }
        };

        // Clear any existing timeout for this user to prevent multiple play attempts
        if (videoPlayTimeouts.current[userId]) {
          clearTimeout(videoPlayTimeouts.current[userId]);
        }

        // Delay video playback to ensure stream stability and prevent interruptions
        videoPlayTimeouts.current[userId] = setTimeout(() => {
          playVideo();
          delete videoPlayTimeouts.current[userId];
        }, 500); // Wait 500ms for stream to stabilize
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
          <span>({participants.length} participants)</span>
          {isCreator && (
            <span
              style={{
                backgroundColor: "#f39c12",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              👑 You are creator
            </span>
          )}
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
                muted
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
                      // Video playback is handled by the remoteStreams useEffect
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

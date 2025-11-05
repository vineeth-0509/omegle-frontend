/*
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const URL = "http://localhost:3000";

export const Room = ({
  name,
  localAudioTrack,
  localMediaTrack,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localMediaTrack: MediaStreamTrack | null;
}) => {
  const [socket, setSocket] = useState<null | Socket>(null);
  const [lobby, setLobby] = useState(true);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null
  );
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {urls: "stun:localhost:3478" },{
          urls:"turn:localhost:3478",
          username:"test",
          credential:"test"
        }
      ],
      iceTransportPolicy:"all",
      iceCandidatePoolSize: 10,
    });
    console.log("created new peerConnection");

    pc.addEventListener('icegatheringstatechange', ()=>{
      if(pc.iceGatheringState === 'complete'){
        console.log('ice gathering complete')
      }
    })

    if (localAudioTrack) {
      console.log("adding local audio track");
      pc.addTrack(localAudioTrack);
    }
    if (localMediaTrack) {
      console.log("adding local video track");
      pc.addTrack(localMediaTrack);
    }

    pc.ontrack = (event) => {
      console.log("Received remote track:", {
        trackKind: event.track.kind,
        trackId: event.track.id,
        streamCount: event.streams.length,
        stream: event.streams[0],
        readyState: event.track.readyState,
      });
      const remoteStream = event.streams[0];
      if (remoteStream) {
        console.log(
          "setting remote tracks",
          remoteStream.getTracks().map((t) => ({
            kind: t.kind,
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
          }))
        );
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          // remoteVideoRef.current.play().catch((error) => {
          //   console.error("error playing remote video", error);
          // });
          remoteVideoRef.current.onloadedmetadata = ()=>{
            console.log('remote video metadata loaded');
            remoteVideoRef.current?.play().catch(error => {
              console.error('error playing remote video', error);
            })
          };

          remoteVideoRef.current.oncanplay = () => {
            console.log('remote video can play')
          }
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && roomIdRef.current && socket) {
        console.log("sending ice candidates", event.candidate.type);
        socket.emit("add-ice-candidate", {
          candidate: event.candidate,
          roomId: roomIdRef.current,
          senderSocketId: socket.id,
        });
      } else if (!event.candidate) {
        console.log("all ice candidates");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("connection state", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ice connection state", pc.iceConnectionState);
    };
    return pc;
  };

  const cleanupConnection = () => {
    if (sendingPc) {
      sendingPc.close();
      console.log("Sending PC closed");
    }
    if (receivingPc) {
      receivingPc.close();
      console.log("Receiving PC closed");
    }
    setSendingPc(null);
    setReceivingPc(null);
    setMessages([]);
    setConnectedUser(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleNext = () => {
    console.log("next button clicked");
    if (socket && roomIdRef.current) {
      socket.emit("next-user", { roomId: roomIdRef.current });
    }
    cleanupConnection();
    setLobby(true);
  };

  useEffect(() => {
    if (!name) return;
    console.log("connecting to the socket");
    const socket = io(URL,{
      transports:['websocket','polling'],
      reconnection: true,
      reconnectionAttempts:5,
      reconnectionDelay: 100
    });
    setSocket(socket);

    socket.on("connect", () => {
      console.log("connected to server", socket.id);
    });

    socket.on("send-offer", async ({ roomId }) => {
      console.log("userA received send-offer for room", roomId);
      roomIdRef.current = roomId;
      console.log("Creating offer for room:", roomId);
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection();
      setSendingPc(pc);
      try {
        console.log("userA creating offer");
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        console.log("userA offer created");

        await pc.setLocalDescription(offer);
        console.log("userA localdescription set");
        console.log("sending offer sdp");
        socket.emit("offer", {
          roomId,
          sdp: pc.localDescription,
          senderSocketId: socket.id,
        });
      } catch (error) {
        console.log("Error in sending offer:", error);
      }
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      try {
        console.log("userB received offer ");
        roomIdRef.current = roomId;
        console.log("Receiving offer, creating answer for room:", roomId);
        setLobby(false);
        setConnectedUser("stranger");

        const pc = createPeerConnection();
        setReceivingPc(pc);
        console.log("userB setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));

        console.log("userB creating answer");
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(answer);
        console.log("usrB localdescription set");
        console.log("sending answer sdp");
        socket.emit("answer", {
          roomId,
          sdp: pc.localDescription,
          senderSocketId: socket.id,
        });
      } catch (error) {
        console.error("userb error offer: ", error);
      }
    });

    socket.on("answer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("receiving answer for room: ", roomId);
      if (sendingPc) {
        try {
          await sendingPc.setRemoteDescription(remoteSdp);
          console.log("Remote description set on sending pc");
        } catch (error) {
          console.error("Error setting remote descripiton:", error);
        }
      } else {
        console.warn("no sending pc available for answer");
      }
    });

    socket.on("add-ice-candidate", async ({ candidate, roomId }) => {
      try {
        console.log("received icecandidate");
        const iceCandidate = new RTCIceCandidate(candidate);
        if (sendingPc) {
          await sendingPc.addIceCandidate(iceCandidate);
        }
        if (receivingPc) {
          await receivingPc.addIceCandidate(iceCandidate);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    socket.on("room-ready", ({ roomId }) => {
      roomIdRef.current = roomId;
      console.log("Room ready for chat", roomId);
    });

    socket.on("lobby", () => {
      cleanupConnection();
      setLobby(true);
    });

    socket.on("user-disconnected", () => {
      alert("stranger disconnected");
      cleanupConnection();
      setLobby(true);
    });

    socket.on("connect_error", (error) => {
      console.error("connection error", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("disconnected from server",reason);
      if(reason === 'io server disconnect'){
        socket.connect();
      }
    })
    return () => {
      cleanupConnection();
      socket.disconnect();
    };
  }, [name, localAudioTrack, localMediaTrack]);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = ({ message }: { message: string }) => {
      console.log("Received message", message);
      setMessages((prev) => [...prev, { text: message, self: false }]);
    };
    socket.on("receive-message", handleReceiveMessage);
    return () => {
      socket?.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      console.log("setting local media");
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play();
    }
  }, [localMediaTrack]);

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) {
      console.warn("cannot send message something missing");
      return;
    }
    console.log(
      "sending message to room:",
      roomIdRef.current,
      "Message:",
      input
    );
    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    });
    setMessages((prev) => [...prev, { text: input, self: true }]);
    setInput("");
  };

  return (
    <div className="flex flex-col items-center bg-gray-900 text-white min-h-screen p-6">
      <div className="w-full max-w-6xl mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Video Chat</h1>
          <div className="flex gap-4">
            <span className="bg-green-600 px-3 py-1 rounded-full">
              {connectedUser || "Connecting..."}
            </span>
            <button
              onClick={handleNext}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold">
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 w-full max-w-6xl">
        <div className="flex-1">
          <div className="bg-black rounded-xl overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-64 object-cover"
            />
            <div className="p-3 bg-gray-800 text-center">
              <span className="text-sm text-gray-300">You</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-black rounded-xl overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              className="w-full h-64 object-cover bg-gray-800"
            />
            <div className="p-3 bg-gray-800 text-center">
              <span className="text-sm text-gray-300">
                {connectedUser || "Waiting for stranger..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {lobby && (
        <div className="mt-8 text-center">
          <div className="text-xl text-gray-400 mb-4">
            Looking for someone to connect with...
          </div>
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto"></div>
          </div>
        </div>
      )}

      {!lobby && (
        <div className="w-full max-w-2xl mt-8 bg-gray-800 rounded-xl p-4 shadow-lg flex flex-col">
          <h2 className="text-2xl font-bold mb-4 text-center">Chat</h2>

          <div className="flex-1 overflow-y-auto mb-4 space-y-2 h-64 p-2 bg-gray-900 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                Start a conversation...
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-xs p-3 rounded-xl ${
                    msg.self ? "bg-blue-600 ml-auto" : "bg-gray-700 mr-auto"
                  }`}>
                  {msg.text}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-700 p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold"
              onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


*/


// "use client"

// import { useEffect, useRef, useState } from "react"
// import { io, type Socket } from "socket.io-client"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Send, SkipForward, LogOut } from "lucide-react"
// import { useNavigate } from "react-router-dom"

// const URL = "http://localhost:3000"

// export const Room = ({
//   name,
//   localAudioTrack,
//   localMediaTrack,
// }: {
//   name: string
//   localAudioTrack: MediaStreamTrack | null
//   localMediaTrack: MediaStreamTrack | null
// }) => {
//   const [socket, setSocket] = useState<null | Socket>(null)
//   const [lobby, setLobby] = useState(true)
//   const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null)
//   const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null)
//   const roomIdRef = useRef<string | null>(null)
//   const remoteVideoRef = useRef<HTMLVideoElement>(null)
//   const localVideoRef = useRef<HTMLVideoElement>(null)
//   const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([])
//   const [input, setInput] = useState("")
//   const [connectedUser, setConnectedUser] = useState<string | null>(null)
//   const navigate = useNavigate()

//   const createPeerConnection = () => {
//     const pc = new RTCPeerConnection({
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         { urls: "stun:stun1.l.google.com:19302" },
//         { urls: "stun:localhost:3478" },
//         {
//           urls: "turn:localhost:3478",
//           username: "test",
//           credential: "test",
//         },
//       ],
//       iceTransportPolicy: "all",
//       iceCandidatePoolSize: 10,
//     })
//     console.log("created new peerConnection")

//     pc.addEventListener("icegatheringstatechange", () => {
//       if (pc.iceGatheringState === "complete") {
//         console.log("ice gathering complete")
//       }
//     })

//     if (localAudioTrack) {
//       console.log("adding local audio track")
//       pc.addTrack(localAudioTrack)
//     }
//     if (localMediaTrack) {
//       console.log("adding local video track")
//       pc.addTrack(localMediaTrack)
//     }

//     pc.ontrack = (event) => {
//       console.log("Received remote track:", {
//         trackKind: event.track.kind,
//         trackId: event.track.id,
//         streamCount: event.streams.length,
//         stream: event.streams[0],
//         readyState: event.track.readyState,
//       })
//       const remoteStream = event.streams[0]
//       if (remoteStream) {
//         console.log(
//           "setting remote tracks",
//           remoteStream.getTracks().map((t) => ({
//             kind: t.kind,
//             id: t.id,
//             enabled: t.enabled,
//             readyState: t.readyState,
//           })),
//         )
//         if (remoteVideoRef.current) {
//           remoteVideoRef.current.srcObject = remoteStream
//           remoteVideoRef.current.onloadedmetadata = () => {
//             console.log("remote video metadata loaded")
//             remoteVideoRef.current?.play().catch((error) => {
//               console.error("error playing remote video", error)
//             })
//           }

//           remoteVideoRef.current.oncanplay = () => {
//             console.log("remote video can play")
//           }
//         }
//       }
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate && roomIdRef.current && socket) {
//         console.log("sending ice candidates", event.candidate.type)
//         socket.emit("add-ice-candidate", {
//           candidate: event.candidate,
//           roomId: roomIdRef.current,
//           senderSocketId: socket.id,
//         })
//       } else if (!event.candidate) {
//         console.log("all ice candidates")
//       }
//     }

//     pc.onconnectionstatechange = () => {
//       console.log("connection state", pc.connectionState)
//     }

//     pc.oniceconnectionstatechange = () => {
//       console.log("ice connection state", pc.iceConnectionState)
//     }
//     return pc
//   }

//   const cleanupConnection = () => {
//     if (sendingPc) {
//       sendingPc.close()
//       console.log("Sending PC closed")
//     }
//     if (receivingPc) {
//       receivingPc.close()
//       console.log("Receiving PC closed")
//     }
//     setSendingPc(null)
//     setReceivingPc(null)
//     setMessages([])
//     setConnectedUser(null)
//     if (remoteVideoRef.current) {
//       remoteVideoRef.current.srcObject = null
//     }
//   }

//   const handleNext = () => {
//     console.log("next button clicked")
//     if (socket && roomIdRef.current) {
//       socket.emit("next-user", { roomId: roomIdRef.current })
//     }
//     cleanupConnection()
//     setLobby(true)
//   }

//   const handleLeave = () => {
//     cleanupConnection()
//     if (socket) {
//       socket.disconnect()
//     }
//     navigate("/")
//   }

//   useEffect(() => {
//     if (!name) return
//     console.log("connecting to the socket")
//     const socket = io(URL, {
//       transports: ["websocket", "polling"],
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 100,
//     })
//     setSocket(socket)

//     socket.on("connect", () => {
//       console.log("connected to server", socket.id)
//     })

//     socket.on("send-offer", async ({ roomId }) => {
//       console.log("userA received send-offer for room", roomId)
//       roomIdRef.current = roomId
//       console.log("Creating offer for room:", roomId)
//       setLobby(false)
//       setConnectedUser("stranger")

//       const pc = createPeerConnection()
//       setSendingPc(pc)
//       try {
//         console.log("userA creating offer")
//         const offer = await pc.createOffer({
//           offerToReceiveAudio: true,
//           offerToReceiveVideo: true,
//         })
//         console.log("userA offer created")

//         await pc.setLocalDescription(offer)
//         console.log("userA localdescription set")
//         console.log("sending offer sdp")
//         socket.emit("offer", {
//           roomId,
//           sdp: pc.localDescription,
//           senderSocketId: socket.id,
//         })
//       } catch (error) {
//         console.log("Error in sending offer:", error)
//       }
//     })

//     socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
//       try {
//         console.log("userB received offer ")
//         roomIdRef.current = roomId
//         console.log("Receiving offer, creating answer for room:", roomId)
//         setLobby(false)
//         setConnectedUser("stranger")

//         const pc = createPeerConnection()
//         setReceivingPc(pc)
//         console.log("userB setting remote description")
//         await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp))

//         console.log("userB creating answer")
//         const answer = await pc.createAnswer({
//           offerToReceiveAudio: true,
//           offerToReceiveVideo: true,
//         })
//         await pc.setLocalDescription(answer)
//         console.log("usrB localdescription set")
//         console.log("sending answer sdp")
//         socket.emit("answer", {
//           roomId,
//           sdp: pc.localDescription,
//           senderSocketId: socket.id,
//         })
//       } catch (error) {
//         console.error("userb error offer: ", error)
//       }
//     })

//     socket.on("answer", async ({ roomId, sdp: remoteSdp }) => {
//       console.log("receiving answer for room: ", roomId)
//       if (sendingPc) {
//         try {
//           await sendingPc.setRemoteDescription(remoteSdp)
//           console.log("Remote description set on sending pc")
//         } catch (error) {
//           console.error("Error setting remote descripiton:", error)
//         }
//       } else {
//         console.warn("no sending pc available for answer")
//       }
//     })

//     socket.on("add-ice-candidate", async ({ candidate, roomId }) => {
//       try {
//         console.log("received icecandidate")
//         const iceCandidate = new RTCIceCandidate(candidate)
//         if (sendingPc) {
//           await sendingPc.addIceCandidate(iceCandidate)
//         }
//         if (receivingPc) {
//           await receivingPc.addIceCandidate(iceCandidate)
//         }
//       } catch (error) {
//         console.error("Error adding ICE candidate:", error)
//       }
//     })

//     socket.on("room-ready", ({ roomId }) => {
//       roomIdRef.current = roomId
//       console.log("Room ready for chat", roomId)
//     })

//     socket.on("lobby", () => {
//       cleanupConnection()
//       setLobby(true)
//     })

//     socket.on("user-disconnected", () => {
//       alert("stranger disconnected")
//       cleanupConnection()
//       setLobby(true)
//     })

//     socket.on("connect_error", (error) => {
//       console.error("connection error", error)
//     })

//     socket.on("disconnect", (reason) => {
//       console.log("disconnected from server", reason)
//       if (reason === "io server disconnect") {
//         socket.connect()
//       }
//     })
//     return () => {
//       cleanupConnection()
//       socket.disconnect()
//     }
//   }, [name, localAudioTrack, localMediaTrack])

//   useEffect(() => {
//     if (!socket) return
//     const handleReceiveMessage = ({ message }: { message: string }) => {
//       console.log("Received message", message)
//       setMessages((prev) => [...prev, { text: message, self: false }])
//     }
//     socket.on("receive-message", handleReceiveMessage)
//     return () => {
//       socket?.off("receive-message", handleReceiveMessage)
//     }
//   }, [socket])

//   useEffect(() => {
//     if (localVideoRef.current && localMediaTrack) {
//       console.log("setting local media")
//       const stream = new MediaStream([localMediaTrack])
//       localVideoRef.current.srcObject = stream
//       localVideoRef.current.play()
//     }
//   }, [localMediaTrack])

//   const sendMessage = () => {
//     if (!roomIdRef.current || !socket || !input.trim()) {
//       console.warn("cannot send message something missing")
//       return
//     }
//     console.log("sending message to room:", roomIdRef.current, "Message:", input)
//     socket.emit("chat-message", {
//       roomId: roomIdRef.current,
//       message: input,
//       senderSocketId: socket.id,
//     })
//     setMessages((prev) => [...prev, { text: input, self: true }])
//     setInput("")
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
//         <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
//           Vinetalk
//         </h1>
//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
//             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//             <span className="text-sm">{connectedUser ? "Connected" : "Connecting..."}</span>
//           </div>
//           <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
//             <LogOut className="w-4 h-4 mr-2" />
//             Leave
//           </Button>
//         </div>
//       </div>

//       {/* Video Grid */}
//       <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
//         {/* Local Video */}
//         <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative group">
//           <video ref={localVideoRef} autoPlay muted className="w-full aspect-video object-cover" />
//           <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
//             You
//           </div>
//         </div>

//         {/* Remote Video */}
//         <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative group">
//           <video ref={remoteVideoRef} autoPlay className="w-full aspect-video object-cover" />
//           <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
//             {connectedUser ? "Stranger" : "Waiting..."}
//           </div>

//           {/* Waiting Indicator */}
//           {lobby && (
//             <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
//               <div className="text-center">
//                 <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
//                 <p className="text-gray-300">Searching for stranger...</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Controls & Chat */}
//       <div className="max-w-7xl mx-auto">
//         {!lobby && (
//           <div className="grid lg:grid-cols-3 gap-6">
//             {/* Skip Button */}
//             <div className="flex gap-2">
//               <Button
//                 onClick={handleNext}
//                 className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
//               >
//                 <SkipForward className="w-5 h-5" />
//                 Next
//               </Button>
//             </div>

//             {/* Chat */}
//             <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col">
//               <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
//                 {messages.length === 0 ? (
//                   <div className="text-center text-gray-500 mt-8">Start a conversation...</div>
//                 ) : (
//                   messages.map((msg, idx) => (
//                     <div
//                       key={idx}
//                       className={`max-w-xs p-3 rounded-xl text-sm ${
//                         msg.self ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto" : "bg-white/10 mr-auto"
//                       }`}
//                     >
//                       {msg.text}
//                     </div>
//                   ))
//                 )}
//               </div>

//               {/* Message Input */}
//               <div className="p-4 border-t border-purple-500/20 flex gap-2">
//                 <Input
//                   className="flex-1 bg-white/10 border-purple-500/20 text-white placeholder-gray-500 rounded-lg py-2 px-4 focus:border-purple-500/50 focus:ring-purple-500/20"
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   placeholder="Type a message..."
//                   onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                 />
//                 <Button
//                   onClick={sendMessage}
//                   className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4"
//                 >
//                   <Send className="w-4 h-4" />
//                 </Button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, SkipForward, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

const URL = "http://localhost:3000"

export const Room = ({
  name,
  localAudioTrack,
  localMediaTrack,
}: {
  name: string
  localAudioTrack: MediaStreamTrack | null
  localMediaTrack: MediaStreamTrack | null
}) => {
  const [socket, setSocket] = useState<null | Socket>(null)
  const [lobby, setLobby] = useState(true)
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null)
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null)
  const roomIdRef = useRef<string | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([])
  const [input, setInput] = useState("")
  const [connectedUser, setConnectedUser] = useState<string | null>(null)
  const navigate = useNavigate()

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:localhost:3478" },
        {
          urls: "turn:localhost:3478",
          username: "test",
          credential: "test",
        },
      ],
      iceTransportPolicy: "all",
      iceCandidatePoolSize: 10,
    })
    console.log("created new peerConnection")

    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        console.log("ice gathering complete")
      }
    })

    if (localAudioTrack) {
      console.log("adding local audio track")
      pc.addTrack(localAudioTrack)
    }
    if (localMediaTrack) {
      console.log("adding local video track")
      pc.addTrack(localMediaTrack)
    }

    pc.ontrack = (event) => {
      console.log("Received remote track:", {
        trackKind: event.track.kind,
        trackId: event.track.id,
        streamCount: event.streams.length,
        stream: event.streams[0],
        readyState: event.track.readyState,
      })
      const remoteStream = event.streams[0]
      if (remoteStream) {
        console.log(
          "setting remote tracks",
          remoteStream.getTracks().map((t) => ({
            kind: t.kind,
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
          })),
        )
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("remote video metadata loaded")
            remoteVideoRef.current?.play().catch((error) => {
              console.error("error playing remote video", error)
            })
          }

          remoteVideoRef.current.oncanplay = () => {
            console.log("remote video can play")
          }
        }
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && roomIdRef.current && socket) {
        console.log("sending ice candidates", event.candidate.type)
        socket.emit("add-ice-candidate", {
          candidate: event.candidate,
          roomId: roomIdRef.current,
          senderSocketId: socket.id,
        })
      } else if (!event.candidate) {
        console.log("all ice candidates")
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("connection state", pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      console.log("ice connection state", pc.iceConnectionState)
    }
    return pc
  }

  const cleanupConnection = () => {
    if (sendingPc) {
      sendingPc.close()
      console.log("Sending PC closed")
    }
    if (receivingPc) {
      receivingPc.close()
      console.log("Receiving PC closed")
    }
    setSendingPc(null)
    setReceivingPc(null)
    setMessages([])
    setConnectedUser(null)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }

  const handleNext = () => {
    console.log("next button clicked")
    if (socket && roomIdRef.current) {
      socket.emit("next-user", { roomId: roomIdRef.current })
    }
    cleanupConnection()
    setLobby(true)
  }

  const handleLeave = () => {
    cleanupConnection()
    if (socket) {
      socket.disconnect()
    }
    navigate("/")
  }

  useEffect(() => {
    if (!name) return
    console.log("connecting to the socket")
    const socket = io(URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 100,
    })
    setSocket(socket)

    socket.on("connect", () => {
      console.log("connected to server", socket.id)
    })

    socket.on("send-offer", async ({ roomId }) => {
      console.log("userA received send-offer for room", roomId)
      roomIdRef.current = roomId
      console.log("Creating offer for room:", roomId)
      setLobby(false)
      setConnectedUser("stranger")

      const pc = createPeerConnection()
      setSendingPc(pc)
      try {
        console.log("userA creating offer")
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        console.log("userA offer created")

        await pc.setLocalDescription(offer)
        console.log("userA localdescription set")
        console.log("sending offer sdp")
        socket.emit("offer", {
          roomId,
          sdp: pc.localDescription,
          senderSocketId: socket.id,
        })
      } catch (error) {
        console.log("Error in sending offer:", error)
      }
    })

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      try {
        console.log("userB received offer ")
        roomIdRef.current = roomId
        console.log("Receiving offer, creating answer for room:", roomId)
        setLobby(false)
        setConnectedUser("stranger")

        const pc = createPeerConnection()
        setReceivingPc(pc)
        console.log("userB setting remote description")
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp))

        console.log("userB creating answer")
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(answer)
        console.log("usrB localdescription set")
        console.log("sending answer sdp")
        socket.emit("answer", {
          roomId,
          sdp: pc.localDescription,
          senderSocketId: socket.id,
        })
      } catch (error) {
        console.error("userb error offer: ", error)
      }
    })

    socket.on("answer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("receiving answer for room: ", roomId)
      if (sendingPc) {
        try {
          await sendingPc.setRemoteDescription(remoteSdp)
          console.log("Remote description set on sending pc")
        } catch (error) {
          console.error("Error setting remote descripiton:", error)
        }
      } else {
        console.warn("no sending pc available for answer")
      }
    })

    socket.on("add-ice-candidate", async ({ candidate, roomId }) => {
      try {
        console.log("received icecandidate")
        const iceCandidate = new RTCIceCandidate(candidate)
        if (sendingPc) {
          await sendingPc.addIceCandidate(iceCandidate)
        }
        if (receivingPc) {
          await receivingPc.addIceCandidate(iceCandidate)
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error)
      }
    })

    socket.on("room-ready", ({ roomId }) => {
      roomIdRef.current = roomId
      console.log("Room ready for chat", roomId)
    })

    socket.on("lobby", () => {
      cleanupConnection()
      setLobby(true)
    })

    socket.on("user-disconnected", () => {
      alert("stranger disconnected")
      cleanupConnection()
      setLobby(true)
    })

    socket.on("connect_error", (error) => {
      console.error("connection error", error)
    })

    socket.on("disconnect", (reason) => {
      console.log("disconnected from server", reason)
      if (reason === "io server disconnect") {
        socket.connect()
      }
    })
    return () => {
      cleanupConnection()
      socket.disconnect()
    }
  }, [name, localAudioTrack, localMediaTrack])

  useEffect(() => {
    if (!socket) return
    const handleReceiveMessage = ({ message }: { message: string }) => {
      console.log("Received message", message)
      setMessages((prev) => [...prev, { text: message, self: false }])
    }
    socket.on("receive-message", handleReceiveMessage)
    return () => {
      socket?.off("receive-message", handleReceiveMessage)
    }
  }, [socket])

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      console.log("setting local media")
      const stream = new MediaStream([localMediaTrack])
      localVideoRef.current.srcObject = stream
      localVideoRef.current.play()
    }
  }, [localMediaTrack])

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) {
      console.warn("cannot send message something missing")
      return
    }
    console.log("sending message to room:", roomIdRef.current, "Message:", input)
    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    })
    setMessages((prev) => [...prev, { text: input, self: true }])
    setInput("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">{connectedUser ? "Connected" : "Connecting..."}</span>
          </div>
          <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        {/* Local Video */}
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative group">
          <video ref={localVideoRef} autoPlay muted className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
            You
          </div>
        </div>

        {/* Remote Video */}
        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative group">
          <video ref={remoteVideoRef} autoPlay className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>

          {/* Waiting Indicator */}
          {lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Searching for stranger...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Chat */}
      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Skip Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-white/5">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">Start a conversation...</div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto" : "bg-white/10 mr-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-purple-500/20 flex gap-2">
                <Input
                  className="flex-1 bg-white/10 border-purple-500/20 text-white placeholder-gray-500 rounded-lg py-2 px-4 focus:border-purple-500/50 focus:ring-purple-500/20"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button
                  onClick={sendMessage}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

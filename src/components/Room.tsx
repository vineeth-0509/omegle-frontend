/*
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";
//const URL = "http://localhost:3000";

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
  const navigate = useNavigate();

  const createPeerConnection = () => {
   const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
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
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    console.log("created new peerConnection");

    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        console.log("ice gathering complete");
      }
    });

    if (localAudioTrack) {
      try {
        pc.addTrack(localAudioTrack);
        console.log("added local audio track");
      } catch (error) {
        console.error("failed to add audio track:", error);
      }
    }
    if (localMediaTrack) {
      try {
        pc.addTrack(localMediaTrack);
        console.log("added local media track");
      } catch (error) {
        console.error("failed to add video track", error);
      }
    }

    pc.ontrack = (event) => {
      console.log(
        "Received remote track:",
       { kind: event.track.kind,
        id: event.track.id,
        stream: event.streams[0],
        trackReadyState: event.track.readyState
      }
      );

      const remoteStream = event.streams[0];
      if (remoteStream && remoteVideoRef.current) {
        console.log(
          "setting remote tracks",
          remoteStream.getTracks().map((t) => ({
            kind: t.kind,
            id: t.id,
          }))
        );
        // if (remoteVideoRef.current) {
        //   remoteVideoRef.current.srcObject = remoteStream;
        //   remoteVideoRef.current.onloadedmetadata = () => {
        //     console.log("remote video metadata loaded");
        //     remoteVideoRef.current?.play().catch((error) => {
        //       console.error("error playing remote video", error);
        //     });
        //   };

        //   remoteVideoRef.current.oncanplay = () => {
        //     console.log("remote video can play");
        //   };
        // }
        remoteVideoRef.current.srcObject = remoteStream;

        const playVideo = () => {
          if(remoteVideoRef.current){
            remoteVideoRef.current.play().then(()=> {
              console.log('remote video playing success')
            }).catch(error => {
              console.error("error playing remote video", error);
              setTimeout(playVideo, 100);
            })
          }
        };
        playVideo();
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
      if (pc.connectionState === "connected") {
        console.log("peer connection established");
      } else if (pc.connectionState === "failed") {
        console.error("peer connection failed");
        setTimeout(() => {
          if(pc.connectionState === 'failed'){
            console.log('attempting to restart ice')
          }
        }, 2000)
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ice connection state", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () =>{
      console.log('signaling state', pc.signalingState);
    }
    return pc;
  };

  const cleanupConnection = () => {
    if (sendingPc) {
      sendingPc.close();
      console.log("Sending PC closed");
      setSendingPc(null);
    }
    if (receivingPc) {
      receivingPc.close();
      console.log("Receiving PC closed");
      setReceivingPc(null);
    }

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

  const handleLeave = () => {
    cleanupConnection();
    if (socket) {
      socket.disconnect();
    }
    navigate("/");
  };

  useEffect(() => {
    if (!name) return;
    console.log("connecting to the socket");
    const socket = io(URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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
        console.log("offer sent to server");
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
        if(localAudioTrack) pc.addTrack(localAudioTrack);
        if(localMediaTrack) pc.addTrack(localMediaTrack)
        setReceivingPc(pc);
        console.log("userB setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));

        console.log("userB creating answer");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("usrB localdescription set");
        console.log("sending answer sdp");
        socket.emit("answer", {
          roomId,
          sdp: pc.localDescription,
          senderSocketId: socket.id,
        });
        console.log("answer sent to server");
      } catch (error) {
        console.error("userb error offer: ", error);
      }
    });

    socket.on("answer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("receiving answer for room: ", roomId);
      if (sendingPc) {
        try {
          await sendingPc.setRemoteDescription(
            new RTCSessionDescription(remoteSdp)
          );
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
          console.log("ice candidate added to sending pc");
        }
        if (receivingPc) {
          await receivingPc.addIceCandidate(iceCandidate);
          console.log("ice candidate added to the receiving pc");
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
      setMessages((prev) => [
        ...prev,
        { text: "Stranger disconnected", self: false },
      ]);
      cleanupConnection();
      setLobby(true);
    });

    socket.on("connect_error", (error) => {
      console.error("connection error", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("disconnected from server", reason);
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });
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
    const logConnectionState = () => {
      console.log("connection state check", {
        socketConnected: socket?.connected,
        lobby,
        connectedUser,
        roomId: roomIdRef.current,
        sendingPc: sendingPc
          ? {
              connectionState: sendingPc.connectionState,
              iceConnectionState: sendingPc.iceConnectionState,
            }
          : "null",
        receivingPc: receivingPc
          ? {
              connectionState: receivingPc.connectionState,
              iceConnectionState: receivingPc.iceConnectionState,
            }
          : "null",
      });
    };
    const interval = setInterval(logConnectionState, 5000);
    return () => clearInterval(interval);
  }, [socket, lobby, connectedUser, sendingPc, receivingPc]);

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      console.log("setting local media");
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
     
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {connectedUser ? "Connected" : "Connecting..."}
            </span>
          </div>
          <Button
            onClick={handleLeave}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative group">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
            You
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative group">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-gray-300">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>

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

      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
           
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2">
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-white/5">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    Start a conversation...
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto"
                          : "bg-white/10 mr-auto"
                      }`}>
                      {msg.text}
                    </div>
                  ))
                )}
              </div>

            
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
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

*/


/*
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";
// const URL = "http://localhost:3000";

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
  const [sendingPc, setSendingPc] = useState<RTCPeerConnection | null>(null);
  const [receivingPc, setReceivingPc] = useState<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(console.error);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && roomIdRef.current) {
        socket.emit("add-ice-candidate", {
          candidate: event.candidate,
          roomId: roomIdRef.current,
          senderSocketId: socket.id,
        });
      }
    };

    return pc;
  };

  const cleanupConnection = () => {
    sendingPc?.close();
    receivingPc?.close();
    setSendingPc(null);
    setReceivingPc(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleNext = () => {
    if (socket && roomIdRef.current) socket.emit("next-user", { roomId: roomIdRef.current });
    cleanupConnection();
    setLobby(true);
  };

  const handleLeave = () => {
    cleanupConnection();
    socket?.disconnect();
    navigate("/");
  };

  useEffect(() => {
    if (!name) return;
    const sock = io(URL, { query: { name } });
    setSocket(sock);

    sock.on("connect", () => console.log("Connected to server:", sock.id));

  
    sock.on("send-offer", async ({ roomId }) => {
      console.log("UserA: sending offer for room", roomId);
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection();
      setSendingPc(pc);

      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localMediaTrack) pc.addTrack(localMediaTrack);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sock.emit("offer", { roomId, sdp: offer, senderSocketId: sock.id });
    });

    sock.on("offer", async ({ roomId, sdp }) => {
      console.log("UserB: received offer");
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection();
      setReceivingPc(pc);

      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localMediaTrack) pc.addTrack(localMediaTrack);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sock.emit("answer", { roomId, sdp: answer, senderSocketId: sock.id });
    });

   
    sock.on("answer", async ({ sdp }) => {
      if (sendingPc) {
        await sendingPc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(" UserA: remote description set from answer");
      }
    });

    
    sock.on("add-ice-candidate", async ({ candidate }) => {
      const ice = new RTCIceCandidate(candidate);
      if (sendingPc) await sendingPc.addIceCandidate(ice).catch(console.error);
      if (receivingPc) await receivingPc.addIceCandidate(ice).catch(console.error);
    });

  
    sock.on("receive-message", ({ message }) =>
      setMessages((prev) => [...prev, { text: message, self: false }])
    );

    sock.on("user-disconnected", () => {
      alert("Stranger disconnected");
      cleanupConnection();
      setLobby(true);
    });

    return () => {
      cleanupConnection();
      sock.disconnect();
    };
  }, [name, localAudioTrack, localMediaTrack]);

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack]);

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) return;
    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    });
    setMessages((prev) => [...prev, { text: input, self: true }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
     
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {connectedUser ? "Connected" : "Connecting..."}
            </span>
          </div>
          <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative">
          <video ref={localVideoRef} autoPlay muted className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">You</div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative">
          <video ref={remoteVideoRef} autoPlay className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>

          {lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Searching for stranger...</p>
              </div>
            </div>
          )}
        </div>
      </div>

   
      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    Start a conversation...
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto"
                          : "bg-white/10 mr-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-purple-500/20 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border-purple-500/20 text-white rounded-lg"
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
  );
};
*/


/*
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";

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
  const [sendingPc, setSendingPc] = useState<RTCPeerConnection | null>(null);
  const [receivingPc, setReceivingPc] = useState<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const createPeerConnection = (isReceiving: boolean = false) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    console.log(` Created ${isReceiving ? 'receiving' : 'sending'} PC`);

    if (isReceiving) {
      pc.ontrack = (event) => {
        console.log(" REMOTE TRACK RECEIVED:", event.streams[0]);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(error => {
            console.error(" Failed to play remote video:", error);
          });
          console.log(" Remote video stream set and playing");
        }
      };
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && roomIdRef.current) {
        console.log("Sending ICE candidate");
        socket.emit("add-ice-candidate", {
          candidate: event.candidate,
          roomId: roomIdRef.current,
          senderSocketId: socket.id,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(` ${isReceiving ? 'Receiving' : 'Sending'} PC state:`, pc.connectionState);
    };

    return pc;
  };

  const cleanupConnection = () => {
    sendingPc?.close();
    receivingPc?.close();
    setSendingPc(null);
    setReceivingPc(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleNext = () => {
    if (socket && roomIdRef.current) socket.emit("next-user", { roomId: roomIdRef.current });
    cleanupConnection();
    setLobby(true);
  };

  const handleLeave = () => {
    cleanupConnection();
    socket?.disconnect();
    navigate("/");
  };

  useEffect(() => {
    if (!name) return;
    const sock = io(URL, { query: { name } });
    setSocket(sock);

    sock.on("connect", () => console.log("Connected to server:", sock.id));

    sock.on("send-offer", async ({ roomId }) => {
      console.log("📡 UserA: Creating OFFER for room", roomId);
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      
      const pc = createPeerConnection(false); 
      setSendingPc(pc);

      
      if (localAudioTrack) {
        pc.addTrack(localAudioTrack);
        console.log("Added local audio track to sending PC");
      }
      if (localMediaTrack) {
        pc.addTrack(localMediaTrack);
        console.log(" Added local video track to sending PC");
      }

      
      pc.ontrack = (event) => {
        console.log("UserA: Remote track received on sending PC");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(console.error);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(" UserA: Sending offer");
      sock.emit("offer", { roomId, sdp: offer, senderSocketId: sock.id });
    });

    sock.on("offer", async ({ roomId, sdp }) => {
      console.log(" UserB: Received OFFER, creating ANSWER");
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection(true);
      setReceivingPc(pc);

      
      if (localAudioTrack) {
        pc.addTrack(localAudioTrack);
        console.log(" Added local audio track to receiving PC");
      }
      if (localMediaTrack) {
        pc.addTrack(localMediaTrack);
        console.log("Added local video track to receiving PC");
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("UserB: Sending answer");
      sock.emit("answer", { roomId, sdp: answer, senderSocketId: sock.id });
    });

    sock.on("answer", async ({ sdp }) => {
      console.log(" UserA: Received ANSWER");
      if (sendingPc) {
        await sendingPc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(" UserA: Remote description set from answer");
      } else {
        console.error(" UserA: No sending PC for answer");
      }
    });

    sock.on("add-ice-candidate", async ({ candidate }) => {
      const ice = new RTCIceCandidate(candidate);
      console.log("Processing ICE candidate");
      
      if (sendingPc) {
        await sendingPc.addIceCandidate(ice).catch(error => 
          console.error("Error adding ICE to sending PC:", error)
        );
      }
      if (receivingPc) {
        await receivingPc.addIceCandidate(ice).catch(error =>
          console.error(" Error adding ICE to receiving PC:", error)
        );
      }
    });

 
    sock.on("receive-message", ({ message }) => {
      console.log(" Received message:", message);
      setMessages((prev) => [...prev, { text: message, self: false }]);
    });

    sock.on("user-disconnected", () => {
      console.log("Stranger disconnected");
      alert("Stranger disconnected");
      cleanupConnection();
      setLobby(true);
    });

    sock.on("room-ready", ({ roomId }) => {
      console.log(" Room ready:", roomId);
      roomIdRef.current = roomId;
    });

    return () => {
      cleanupConnection();
      sock.disconnect();
    };
  }, [name, localAudioTrack, localMediaTrack]);

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack]);

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) return;
    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    });
    setMessages((prev) => [...prev, { text: input, self: true }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
     
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {connectedUser ? "Connected" : "Connecting..."}
            </span>
          </div>
          <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

     
      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative">
          <video ref={localVideoRef} autoPlay muted className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">You</div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            className="w-full aspect-video object-cover bg-gray-900"
            onLoadedMetadata={() => console.log("Remote video metadata loaded")}
            onCanPlay={() => console.log(" Remote video can play")}
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>

          {lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Searching for stranger...</p>
              </div>
            </div>
          )}
        </div>
      </div>

   
      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    Start a conversation...
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto"
                          : "bg-white/10 mr-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-purple-500/20 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border-purple-500/20 text-white rounded-lg"
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
  );
};
*/

/*
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";

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
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!name) return;
    
    const sock = io(URL, { query: { name } });
    setSocket(sock);

    sock.on("connect", () => console.log("✅ Connected to server:", sock.id));

    // User A: Creates offer
    sock.on("send-offer", async ({ roomId }) => {
      console.log("📡 UserA: Creating OFFER for room", roomId);
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const newPc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      setPc(newPc);

      // Add local tracks
      if (localAudioTrack) newPc.addTrack(localAudioTrack);
      if (localMediaTrack) newPc.addTrack(localMediaTrack);

      // Handle remote tracks
      newPc.ontrack = (event) => {
        console.log("🎥 REMOTE TRACK RECEIVED");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(console.error);
        }
      };

      // Handle ICE candidates
      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          sock.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
            senderSocketId: sock.id,
          });
        }
      };

      const offer = await newPc.createOffer();
      await newPc.setLocalDescription(offer);
      sock.emit("offer", { roomId, sdp: offer, senderSocketId: sock.id });
    });

    // User B: Receives offer, creates answer
    sock.on("offer", async ({ roomId, sdp }) => {
      console.log("📥 UserB: Received OFFER");
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const newPc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      setPc(newPc);

      // Add local tracks
      if (localAudioTrack) newPc.addTrack(localAudioTrack);
      if (localMediaTrack) newPc.addTrack(localMediaTrack);

      // Handle remote tracks
      newPc.ontrack = (event) => {
        console.log("🎥 REMOTE TRACK RECEIVED");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(console.error);
        }
      };

      // Handle ICE candidates
      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          sock.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
            senderSocketId: sock.id,
          });
        }
      };

      await newPc.setRemoteDescription(sdp);
      const answer = await newPc.createAnswer();
      await newPc.setLocalDescription(answer);
      sock.emit("answer", { roomId, sdp: answer, senderSocketId: sock.id });
    });

    // User A: Receives answer
    sock.on("answer", async ({ sdp }) => {
      console.log("📥 UserA: Received ANSWER");
      if (pc) {
        await pc.setRemoteDescription(sdp);
      }
    });

    // Handle ICE candidates
    sock.on("add-ice-candidate", async ({ candidate, senderSocketId }) => {
      console.log("🧊 Processing ICE candidate");
      if (pc) {
        await pc.addIceCandidate(candidate).catch(console.error);
      }
    });

    // Handle chat messages
    sock.on("receive-message", ({ message }) => {
      setMessages((prev) => [...prev, { text: message, self: false }]);
    });

    sock.on("user-disconnected", () => {
      console.log("🚪 Stranger disconnected");
      setLobby(true);
      setConnectedUser(null);
      if (pc) pc.close();
      setPc(null);
    });

    sock.on("room-ready", ({ roomId }) => {
      roomIdRef.current = roomId;
    });

    return () => {
      sock.disconnect();
      if (pc) pc.close();
    };
  }, [name, localAudioTrack, localMediaTrack]);

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack]);

  const handleNext = () => {
    if (socket && roomIdRef.current) {
      socket.emit("next-user", { roomId: roomIdRef.current });
    }
    setLobby(true);
    setConnectedUser(null);
    if (pc) pc.close();
    setPc(null);
  };

  const handleLeave = () => {
    if (pc) pc.close();
    socket?.disconnect();
    navigate("/");
  };

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) return;
    
    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    });
    setMessages((prev) => [...prev, { text: input, self: true }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {connectedUser ? "Connected" : lobby ? "Searching..." : "Connecting..."}
            </span>
          </div>
          <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline
            className="w-full aspect-video object-cover" 
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">You</div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className="w-full aspect-video object-cover bg-gray-900"
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>

          {lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Searching for stranger...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    Start a conversation...
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto"
                          : "bg-white/10 mr-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-purple-500/20 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border-purple-500/20 text-white rounded-lg"
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
  );
};
*/
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";

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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!name) return;
    const sock = io(URL, { query: { name } });
    setSocket(sock);

    // Socket connection monitoring
    sock.on("connect", () => {
      console.log("✅ Connected to server:", sock.id);
      console.log("📡 Socket connected:", sock.connected);
    });

    sock.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    sock.on("error", (error) => {
      console.log("💥 Socket error:", error);
    });

    sock.on("lobby", () => {
      console.log("🎪 Received lobby event - waiting for pairing");
    });

    const setupConnectionMonitoring = (pc: RTCPeerConnection) => {
      pc.onconnectionstatechange = () => {
        console.log(`connection state:`, pc.connectionState);
      };
      pc.oniceconnectionstatechange = () => {
        console.log('ice connection state:', pc.iceConnectionState);
      };
    };

    // 🟢 Create and set up a new PeerConnection
    const createPeerConnection = () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      setupConnectionMonitoring(pc);

      pc.ontrack = (event) => {
        console.log("🎥 Remote track received");
        let remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
        if (!remoteStream) {
          remoteStream = new MediaStream();
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        }
        remoteStream.addTrack(event.track);
        remoteVideoRef.current?.play().catch((err) => {
          console.error("Error playing remote video:", err);
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && roomIdRef.current && sock) {
          console.log("📤 Sending ICE candidate");
          sock.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId: roomIdRef.current,
            senderSocketId: sock.id,
          });
        }
      };

      if (localAudioTrack) pc.addTrack(localAudioTrack);
      if (localMediaTrack) pc.addTrack(localMediaTrack);

      pcRef.current = pc;
      return pc;
    };

    // User A: Creates offer
    sock.on("send-offer", async ({ roomId }) => {
      console.log("📡 UserA: Creating OFFER for room", roomId);
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sock.emit("offer", { roomId, sdp: offer, senderSocketId: sock.id });
    });

    // User B: Receives offer, creates answer
    sock.on("offer", async ({ roomId, sdp }) => {
      console.log("📥 UserB: Received OFFER");
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const pc = createPeerConnection();

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sock.emit("answer", { roomId, sdp: answer, senderSocketId: sock.id });

      // Apply pending ICE candidates
      pendingCandidates.current.forEach((c) => pc.addIceCandidate(c));
      pendingCandidates.current = [];
    });

    // User A: Receives answer
    sock.on("answer", async ({ sdp }) => {
      console.log("📥 UserA: Received ANSWER");
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Apply pending ICE candidates
        pendingCandidates.current.forEach((c) => pc.addIceCandidate(c));
        pendingCandidates.current = [];
      }
    });

    // Handle ICE candidates
    sock.on("add-ice-candidate", async ({ candidate }) => {
      console.log("🧊 Processing ICE candidate");
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    // Handle chat messages
    sock.on("receive-message", ({ message }) => {
      setMessages((prev) => [...prev, { text: message, self: false }]);
    });

    sock.on("user-disconnected", () => {
      console.log("🚪 Stranger disconnected");
      setLobby(true);
      setConnectedUser(null);
      pcRef.current?.close();
      pcRef.current = null;
    });

    sock.on("room-ready", ({ roomId }) => {
      console.log("✅ Room ready:", roomId);
      roomIdRef.current = roomId;
    });

    return () => {
      console.log("🔌 Cleaning up socket connection");
      sock.disconnect();
      pcRef.current?.close();
    };
  }, [name, localAudioTrack, localMediaTrack]);

  // Show local video
  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack]);

  const handleNext = () => {
    if (socket && roomIdRef.current) {
      socket.emit("next-user", { roomId: roomIdRef.current });
    }
    setLobby(true);
    setConnectedUser(null);
    pcRef.current?.close();
    pcRef.current = null;
  };

  const handleLeave = () => {
    pcRef.current?.close();
    socket?.disconnect();
    navigate("/");
  };

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) return;

    socket.emit("chat-message", {
      roomId: roomIdRef.current,
      message: input,
      senderSocketId: socket.id,
    });
    setMessages((prev) => [...prev, { text: input, self: true }]);
    setInput("");
  };

  const checkSocketStatus = () => {
    if (socket) {
      console.log("🔌 Socket Status:", {
        connected: socket.connected,
        id: socket.id,
        roomId: roomIdRef.current,
        lobby: lobby,
        connectedUser: connectedUser
      });
    } else {
      console.log("❌ No socket connection");
    }
  };

  const debugVideo = () => {
    const video = remoteVideoRef.current;
    const stream = video?.srcObject as MediaStream;
    console.log("🎬 VIDEO DEBUG:", {
      hasVideoElement: !!video,
      hasStream: !!stream,
      videoTracks: stream?.getVideoTracks() || [],
      audioTracks: stream?.getAudioTracks() || [],
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      readyState: video?.readyState,
      paused: video?.paused
    });
    
    // Check if we have video tracks with content
    const videoTracks = stream?.getVideoTracks() || [];
    videoTracks.forEach((track, i) => {
      console.log(`📹 Video Track ${i}:`, {
        kind: track.kind,
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled
      });
    });
    
    // Force play attempt
    if (video && stream) {
      video.play()
        .then(() => console.log("✅ Video play successful"))
        .catch(e => console.log("❌ Video play failed:", e.message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Vinetalk
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {connectedUser ? "Connected" : lobby ? "Searching..." : "Connecting..."}
            </span>
          </div>
          <Button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2">
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 max-w-7xl mx-auto">
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full aspect-video object-cover" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">You</div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-black relative">
          <video ref={remoteVideoRef} autoPlay playsInline muted={false} className="w-full aspect-video object-cover bg-gray-900" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">
            {connectedUser ? "Stranger" : "Waiting..."}
          </div>
          {lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Searching for stranger...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat UI */}
      <div className="max-w-7xl mx-auto">
        {!lobby && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="flex gap-2">
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </Button>
              
              <Button
                onClick={debugVideo}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 font-semibold"
              >
                Debug Video
              </Button>

              <Button
                onClick={checkSocketStatus}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold"
              >
                Check Socket
              </Button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border-2 border-purple-500/30 bg-white/5 flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">Start a conversation...</div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-xs p-3 rounded-xl text-sm ${
                        msg.self
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 ml-auto"
                          : "bg-white/10 mr-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-purple-500/20 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border-purple-500/20 text-white rounded-lg"
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

      {/* Show connection status when in lobby */}
      {lobby && (
        <div className="max-w-7xl mx-auto text-center">
          <Button
            onClick={checkSocketStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-6 font-semibold"
          >
            Check Connection Status
          </Button>
        </div>
      )}
    </div>
  );
};
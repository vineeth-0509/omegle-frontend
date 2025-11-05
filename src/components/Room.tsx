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
  const [pc, setPc] = useState<null | RTCPeerConnection>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();


  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

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
    console.log(" created new peerConnection");

   
    if (localAudioTrack) {
      try {
        pc.addTrack(localAudioTrack);
        console.log(" added local audio track");
      } catch (error) {
        console.error(" failed to add audio track:", error);
      }
    }
    if (localMediaTrack) {
      try {
        pc.addTrack(localMediaTrack);
        console.log(" added local video track");
      } catch (error) {
        console.error(" failed to add video track", error);
      }
    }

   
    console.log(" Sender tracks:", pc.getSenders().map(s => s.track?.kind));

   
    pc.ontrack = (event) => {
      console.log(" ONTRACK FIRED - Remote stream received!", {
        streams: event.streams.length,
        tracks: event.streams[0]?.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          readyState: t.readyState
        }))
      });

      const remoteStream = event.streams[0];
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        
      
        console.log(" Remote stream details:", {
          id: remoteStream.id,
          active: remoteStream.active,
          tracks: remoteStream.getTracks().map(t => ({
            kind: t.kind,
            id: t.id,
            readyState: t.readyState,
            enabled: t.enabled
          }))
        });

        
        remoteStream.getTracks().forEach(track => {
          track.onended = () => {
            console.log(` Remote ${track.kind} track ended`);
          };
        });

        if (remoteVideoRef.current) {
          console.log(" Setting remote video source");
          remoteVideoRef.current.srcObject = remoteStream;

         
          const playVideo = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().then(() => {
                console.log(" Remote video playing successfully");
               
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    console.log(" Video dimensions:", {
                      videoWidth: remoteVideoRef.current.videoWidth,
                      videoHeight: remoteVideoRef.current.videoHeight,
                      readyState: remoteVideoRef.current.readyState
                    });
                  }
                }, 1000);
              }).catch(error => {
                console.error(" Error playing remote video:", error);
                setTimeout(playVideo, 500);
              });
            }
          };
          playVideo();
        }
      }
    };

  
    pc.onicecandidate = (event) => {
      if (event.candidate && roomIdRef.current && socket) {
        console.log(" Sending ICE candidate:", event.candidate.type);
        socket.emit("add-ice-candidate", {
          candidate: event.candidate,
          roomId: roomIdRef.current,
          senderSocketId: socket.id,
        });
      } else if (!event.candidate) {
        console.log(" All ICE candidates gathered");
      }
    };

    
    pc.onconnectionstatechange = () => {
      console.log(" Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        console.log(" PEER CONNECTION CONNECTED!");
       
        setTimeout(() => {
          const receivers = pc.getReceivers();
          console.log(" Receivers:", receivers.map(r => ({
            track: r.track?.kind,
            readyState: r.track?.readyState
          })));
        }, 1000);
      } else if (pc.connectionState === "failed") {
        console.error(" Peer connection failed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(" ICE connection state:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(' Signaling state:', pc.signalingState);
    }

    return pc;
  };

  const cleanupConnection = () => {
    if (pcRef.current) {
      pcRef.current.close();
      console.log(" PeerConnection closed");
      pcRef.current = null;
      setPc(null);
    }

    remoteStreamRef.current = null;
    setMessages([]);
    setConnectedUser(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleNext = () => {
    console.log(" Next button clicked");
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

  
  const checkRemoteVideo = () => {
    if (remoteVideoRef.current) {
      const video = remoteVideoRef.current;
      console.log(" Remote video check:", {
        srcObject: video.srcObject,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended,
        networkState: video.networkState
      });
      
      if (remoteStreamRef.current) {
        console.log(" Remote stream check:", {
          active: remoteStreamRef.current.active,
          tracks: remoteStreamRef.current.getTracks().map(t => ({
            kind: t.kind,
            readyState: t.readyState,
            enabled: t.enabled
          }))
        });
      }
    }
  };

  useEffect(() => {
    if (!name) return;
    console.log(" Connecting to the socket");
    const socket = io(URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(socket);

    socket.on("connect", () => {
      console.log(" Connected to server", socket.id);
    });

    socket.on("send-offer", async ({ roomId }) => {
      console.log(" UserA received send-offer for room", roomId);
      roomIdRef.current = roomId;
      console.log(" Creating offer for room:", roomId);
      setLobby(false);
      setConnectedUser("stranger");

      const newPc = createPeerConnection();
      pcRef.current = newPc;
      setPc(newPc);
      try {
        console.log(" UserA creating offer");
        const offer = await newPc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        console.log(" UserA offer created:", offer.type);

        await newPc.setLocalDescription(offer);
        console.log(" UserA local description set");
        
        console.log(" Sending offer SDP");
        socket.emit("offer", {
          roomId,
          sdp: newPc.localDescription,
          senderSocketId: socket.id,
        });
        console.log(" Offer sent to server");
      } catch (error) {
        console.error(" Error in sending offer:", error);
      }
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      try {
        console.log(" UserB received offer for room:", roomId);
        roomIdRef.current = roomId;
        setLobby(false);
        setConnectedUser("stranger");

        const newPc = createPeerConnection();
        pcRef.current = newPc;
        setPc(newPc);
        
        console.log(" UserB setting remote description");
        await newPc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
        console.log(" UserB remote description set");

        console.log(" UserB creating answer");
        const answer = await newPc.createAnswer();
        await newPc.setLocalDescription(answer);
        console.log(" UserB local description set");
        
        console.log("Sending answer SDP");
        socket.emit("answer", {
          roomId,
          sdp: newPc.localDescription,
          senderSocketId: socket.id,
        });
        console.log(" Answer sent to server");
      } catch (error) {
        console.error(" UserB error handling offer: ", error);
      }
    });

    socket.on("answer", async ({ roomId, sdp: remoteSdp }) => {
      console.log(" Receiving answer for room:", roomId);
      const currentPc = pcRef.current;
      if (currentPc) {
        try {
          console.log(" Setting remote description from answer");
          await currentPc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
          console.log(" Remote description set from answer");
          
         
          setTimeout(() => {
            console.log(" Post-answer connection state:", currentPc.connectionState);
          }, 1000);
        } catch (error) {
          console.error(" Error setting remote description from answer:", error);
        }
      } else {
        console.error(" No PC available for answer - this is the bug!");
      }
    });

    socket.on("add-ice-candidate", async ({ candidate, roomId }) => {
      try {
        console.log("Received ICE candidate");
        const iceCandidate = new RTCIceCandidate(candidate);
        const currentPc = pcRef.current;
        if (currentPc) {
          await currentPc.addIceCandidate(iceCandidate);
          console.log("ICE candidate added to PC");
        } else {
          console.error(" No PC available for ICE candidate");
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
      console.log("Back to lobby");
      cleanupConnection();
      setLobby(true);
    });

    socket.on("user-disconnected", () => {
      console.log(" Stranger disconnected");
      setMessages((prev) => [
        ...prev,
        { text: "Stranger disconnected", self: false },
      ]);
      cleanupConnection();
      setLobby(true);
    });

    socket.on("connect_error", (error) => {
      console.error(" Connection error", error);
    });

    socket.on("disconnect", (reason) => {
      console.log(" Disconnected from server", reason);
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
    if (localVideoRef.current && localMediaTrack) {
      console.log("Setting local media");
      const stream = new MediaStream([localMediaTrack]);
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack]);

  const sendMessage = () => {
    if (!roomIdRef.current || !socket || !input.trim()) {
      console.warn("Cannot send message - something missing");
      return;
    }
    console.log("Sending message to room:", roomIdRef.current, "Message:", input);
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
            onClick={checkRemoteVideo}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2">
            Debug Video
          </Button>
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
            className="w-full aspect-video object-cover bg-gray-900"
            style={{ backgroundColor: '#111827' }}
            onLoadedMetadata={() => console.log(" Remote video metadata loaded")}
            onCanPlay={() => console.log(" Remote video can play")}
            onPlay={() => console.log(" Remote video started playing")}
            onError={(e) => console.error(" Remote video error:", e)}
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
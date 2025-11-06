import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, SkipForward, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const URL = "https://omegle-webrtc-backend-1.onrender.com/";
//const URL = 'http://localhost:3000'

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
  const [messages, setMessages] = useState<{ text: string; self: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (!name) return;

    const sock = io(URL, { query: { name } });
    setSocket(sock);

    sock.on("connect", () => console.log("Connected to server:", sock.id));

    sock.on("send-offer", async ({ roomId }) => {
      console.log(" UserA: Creating OFFER for room", roomId);
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const newPc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      pcRef.current = newPc;

      newPc.ontrack = (event) => {
        console.log(" UserA: REMOTE TRACK RECEIVED");
        console.log("Track kind:", event.track.kind);
        console.log("Streams:", event.streams);

        if (remoteVideoRef.current) {
          let stream = remoteVideoRef.current.srcObject as MediaStream;

          if (!stream) {
            stream = new MediaStream();
            remoteVideoRef.current.srcObject = stream;
          }

          stream.addTrack(event.track);
          console.log(
            "Added track to remote video, total tracks:",
            stream.getTracks().length
          );

          remoteVideoRef.current.play().catch((err) => {
            console.error("Error playing remote video:", err);
          });
        }
      };

      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("UserA: Sending ICE candidate");
          sock.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
            senderSocketId: sock.id,
          });
        }
      };

      newPc.oniceconnectionstatechange = () => {
        console.log(" UserA: ICE Connection State:", newPc.iceConnectionState);
      };

      newPc.onconnectionstatechange = () => {
        console.log(" UserA: Connection State:", newPc.connectionState);
      };

      if (localMediaTrack) {
        newPc.addTrack(localMediaTrack);
        console.log(" UserA: Added video track");
      }
      if (localAudioTrack) {
        newPc.addTrack(localAudioTrack);
        console.log(" UserA: Added audio track");
      }

      const offer = await newPc.createOffer();
      await newPc.setLocalDescription(offer);
      console.log(" UserA: Sending offer");
      sock.emit("offer", { roomId, sdp: offer, senderSocketId: sock.id });
    });

    sock.on("offer", async ({ roomId, sdp }) => {
      console.log(" UserB: Received OFFER");
      roomIdRef.current = roomId;
      setLobby(false);
      setConnectedUser("stranger");

      const newPc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      pcRef.current = newPc;

      newPc.ontrack = (event) => {
        console.log(" UserB: REMOTE TRACK RECEIVED", event.streams[0]);
        console.log("Track kind:", event.track.kind);
        console.log("Stream tracks:", event.streams[0].getTracks());
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch((err) => {
            console.error("Error playing remote video:", err);
          });
        }
      };

      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(" UserB: Sending ICE candidate");
          sock.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
            senderSocketId: sock.id,
          });
        }
      };

      newPc.oniceconnectionstatechange = () => {
        console.log(" UserB: ICE Connection State:", newPc.iceConnectionState);
      };

      newPc.onconnectionstatechange = () => {
        console.log(" UserB: Connection State:", newPc.connectionState);
      };

      if (localMediaTrack) {
        newPc.addTrack(localMediaTrack);
        console.log(" UserB: Added video track");
      }
      if (localAudioTrack) {
        newPc.addTrack(localAudioTrack);
        console.log(" UserB: Added audio track");
      }

      await newPc.setRemoteDescription(sdp);
      console.log(" UserB: Set remote description");

      for (const candidate of pendingIceCandidates.current) {
        await newPc.addIceCandidate(candidate).catch(console.error);
        console.log("UserB: Added pending ICE candidate");
      }
      pendingIceCandidates.current = [];

      const answer = await newPc.createAnswer();
      await newPc.setLocalDescription(answer);
      console.log(" UserB: Sending answer");
      sock.emit("answer", { roomId, sdp: answer, senderSocketId: sock.id });
    });

    sock.on("answer", async ({ sdp }) => {
      console.log("UserA: Received ANSWER");
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(sdp);
        console.log(" UserA: Set remote description from answer");

        for (const candidate of pendingIceCandidates.current) {
          await pc.addIceCandidate(candidate).catch(console.error);
          console.log("UserA: Added pending ICE candidate");
        }
        pendingIceCandidates.current = [];
      }
    });

    sock.on("add-ice-candidate", async ({ candidate, senderSocketId }) => {
      console.log("Received ICE candidate from", senderSocketId);
      const pc = pcRef.current;

      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(candidate).catch((err) => {
          console.error("Error adding ICE candidate:", err);
        });
        console.log(" ICE candidate added");
      } else {
        console.log(
          "Storing ICE candidate for later (remoteDescription not set)"
        );
        pendingIceCandidates.current.push(candidate);
      }
    });

    sock.on("receive-message", ({ message }) => {
      setMessages((prev) => [...prev, { text: message, self: false }]);
    });

    sock.on("user-disconnected", () => {
      console.log("Stranger disconnected");
      setLobby(true);
      setConnectedUser(null);
      setMessages([]);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      pendingIceCandidates.current = [];
    });

    sock.on("room-ready", ({ roomId }) => {
      roomIdRef.current = roomId;
      console.log("Room ready:", roomId);
    });

    return () => {
      sock.disconnect();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [name, localAudioTrack, localMediaTrack]);

  useEffect(() => {
    if (localVideoRef.current && localMediaTrack) {
      const stream = new MediaStream([localMediaTrack]);
      if (localAudioTrack) {
        stream.addTrack(localAudioTrack);
      }
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localMediaTrack, localAudioTrack]);

  const handleNext = () => {
    if (socket && roomIdRef.current) {
      socket.emit("next-user", { roomId: roomIdRef.current });
    }
    setLobby(true);
    setConnectedUser(null);
    setMessages([]);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingIceCandidates.current = [];
  };

  const handleLeave = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
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
              {connectedUser
                ? "Connected"
                : lobby
                  ? "Searching..."
                  : "Connecting..."}
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
        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 rounded-full text-sm">
            You
          </div>
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
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2">
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
                      }`}>
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

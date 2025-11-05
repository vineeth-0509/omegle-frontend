// "use client"

// import { useNavigate } from "react-router-dom"
// import { Button } from "@/components/ui/button"
// import { ArrowRight, Moon, Sun } from "lucide-react"
// import { useState, useEffect } from "react"

// export default function Home() {
//   const navigate = useNavigate()
//   const [isDark, setIsDark] = useState(false)

//   useEffect(() => {
//     const savedDark = localStorage.getItem("vinetalk-dark-mode") === "true"
//     setIsDark(savedDark)
//   }, [])

//   const toggleDarkMode = () => {
//     const newDark = !isDark
//     setIsDark(newDark)
//     localStorage.setItem("vinetalk-dark-mode", newDark.toString())
//   }

//   return (
//     <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-white"}`}>
//       <nav
//         className={`fixed top-0 w-full z-50 border-b transition-colors ${isDark ? "border-slate-800 bg-slate-950/80" : "border-gray-200 bg-white/80"} backdrop-blur-md`}
//       >
//         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
//           <div className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
//             Vinetalk
//           </div>
//           <button
//             onClick={toggleDarkMode}
//             className={`p-2 rounded-lg transition-colors ${isDark ? "bg-slate-800 text-cyan-400 hover:bg-slate-700" : "bg-gray-100 text-slate-700 hover:bg-gray-200"}`}
//           >
//             {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
//           </button>
//         </div>
//       </nav>

//       <div
//         className={`relative pt-24 pb-12 ${isDark ? "bg-slate-950" : "bg-gradient-to-b from-white via-blue-50/30 to-white"}`}
//       >
//         <div className="flex justify-center items-center h-32 relative overflow-hidden px-4">
//           {/* Sticker 1: Book */}
//           <div className="absolute animate-float-slow" style={{ left: "5%", animationDelay: "0s" }}>
//             <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
//               <span className="text-4xl">📚</span>
//             </div>
//           </div>

//           {/* Sticker 2: Thinking face */}
//           <div className="absolute animate-float" style={{ left: "15%", animationDelay: "0.5s" }}>
//             <div
//               className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
//             >
//               <span className="text-4xl">🤔</span>
//             </div>
//           </div>

//           {/* Sticker 3: Smart face */}
//           <div className="absolute animate-float-slow" style={{ left: "25%", animationDelay: "1s" }}>
//             <div
//               className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isDark ? "bg-slate-800" : "bg-gray-200"}`}
//             >
//               <span className="text-4xl">😎</span>
//             </div>
//           </div>

//           {/* Sticker 4: Lightbulb */}
//           <div className="absolute animate-float" style={{ left: "35%", animationDelay: "0.3s" }}>
//             <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
//               <span className="text-4xl">💡</span>
//             </div>
//           </div>

//           {/* Sticker 5: Robot */}
//           <div className="absolute animate-float-reverse" style={{ left: "45%", animationDelay: "0s" }}>
//             <div
//               className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
//             >
//               <span className="text-5xl">🤖</span>
//             </div>
//           </div>

//           {/* Sticker 6: Happy face */}
//           <div className="absolute animate-float" style={{ left: "55%", animationDelay: "1s" }}>
//             <div
//               className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
//             >
//               <span className="text-4xl">😄</span>
//             </div>
//           </div>

//           {/* Sticker 7: Headphones */}
//           <div className="absolute animate-float-slow" style={{ left: "65%", animationDelay: "1.5s" }}>
//             <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
//               <span className="text-4xl">🎧</span>
//             </div>
//           </div>

//           {/* Sticker 8: Smiley */}
//           <div className="absolute animate-float" style={{ left: "75%", animationDelay: "0.7s" }}>
//             <div
//               className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
//             >
//               <span className="text-4xl">😊</span>
//             </div>
//           </div>

//           {/* Sticker 9: Check */}
//           <div className="absolute animate-float-reverse" style={{ left: "85%", animationDelay: "0.5s" }}>
//             <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
//               <span className="text-4xl">✅</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div
//         className={`relative z-10 flex flex-col items-center justify-center px-4 py-20 ${isDark ? "bg-slate-950" : "bg-white"}`}
//       >
//         {/* Tagline Badge */}
//         <div className="mb-8 animate-fade-in">
//           <div
//             className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm ${isDark ? "bg-blue-600/10 border-blue-500/40" : "bg-blue-100/50 border-blue-200"}`}
//           >
//             <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? "bg-cyan-400" : "bg-cyan-600"}`}></span>
//             <span className={`text-sm font-medium ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
//               Connect instantly with people worldwide
//             </span>
//           </div>
//         </div>

//         {/* Hero Heading */}
//         <h1
//           className={`text-5xl md:text-7xl font-black text-center mb-6 leading-tight ${isDark ? "text-slate-50" : "text-slate-950"}`}
//         >
//           Connect. Chat.{" "}
//           <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
//             Vibe.
//           </span>
//         </h1>

//         {/* Subheading */}
//         <p className={`text-lg md:text-xl text-center mb-8 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
//           Meet random people through instant video chat. No bots, no endless swiping—just real conversations with real
//           people. Vinetalk makes connecting fun, fast, and totally anonymous.
//         </p>

//         {/* CTA Buttons */}
//         <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in">
//           <Button
//             onClick={() => navigate("/landing")}
//             className="group relative px-8 py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-400/30"
//           >
//             <span className="flex items-center gap-2">
//               Start Chatting
//               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
//             </span>
//           </Button>

//           <Button
//             className={`px-8 py-6 text-lg font-bold rounded-lg transition-all duration-300 ${isDark ? "bg-slate-900 border-2 border-purple-600/50 text-purple-300 hover:bg-purple-600/10 hover:border-purple-500/80" : "bg-gray-100 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500"}`}
//             variant="outline"
//           >
//             How it Works
//           </Button>
//         </div>

//         {/* Features Grid */}
//         <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mb-16 animate-fade-in px-4">
//           {[
//             {
//               icon: "⚡",
//               title: "Instant Connect",
//               desc: "Get matched with someone in seconds",
//               color: "blue",
//             },
//             {
//               icon: "🎥",
//               title: "Crystal Quality",
//               desc: "HD video & audio for real conversations",
//               color: "purple",
//             },
//             {
//               icon: "🔒",
//               title: "Totally Private",
//               desc: "Stay anonymous and skip whenever",
//               color: "cyan",
//             },
//           ].map((feature, idx) => (
//             <div
//               key={idx}
//               className={`group p-8 rounded-xl border transition-all duration-300 ${isDark ? `bg-${feature.color}-950/20 border-${feature.color}-500/30 hover:border-${feature.color}-500/60 hover:shadow-lg hover:shadow-${feature.color}-500/20` : `bg-${feature.color}-50 border-${feature.color}-200 hover:border-${feature.color}-400`}`}
//             >
//               <div className="text-4xl mb-4">{feature.icon}</div>
//               <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-slate-50" : "text-slate-950"}`}>
//                 {feature.title}
//               </h3>
//               <p className={`${isDark ? "text-slate-400" : "text-slate-600"}`}>{feature.desc}</p>
//             </div>
//           ))}
//         </div>

//         {/* Stats */}
//         <div
//           className={`grid grid-cols-3 gap-8 pt-12 border-t w-full max-w-2xl px-4 ${isDark ? "border-blue-500/20" : "border-blue-200"}`}
//         >
//           <div className="text-center">
//             <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
//               50K+
//             </div>
//             <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Online Now</p>
//           </div>
//           <div className="text-center">
//             <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
//               1M+
//             </div>
//             <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Monthly Users</p>
//           </div>
//           <div className="text-center">
//             <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent mb-2">
//               100%
//             </div>
//             <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Anonymous</p>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         @keyframes float {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-20px); }
//         }

//         @keyframes float-slow {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-15px); }
//         }

//         @keyframes float-reverse {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-25px); }
//         }

//         .animate-float {
//           animation: float 3s ease-in-out infinite;
//         }

//         .animate-float-slow {
//           animation: float-slow 4s ease-in-out infinite;
//         }

//         .animate-float-reverse {
//           animation: float-reverse 3.5s ease-in-out infinite;
//         }

//         @keyframes fade-in {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }

//         .animate-fade-in {
//           animation: fade-in 0.8s ease-out;
//         }
//       `}</style>
//     </div>
//   )
// }

"use client"

import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowRight, Moon, Sun } from "lucide-react"
import { useState, useEffect } from "react"

export default function Home() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedDark = localStorage.getItem("vinetalk-dark-mode") === "true"
    setIsDark(savedDark)
  }, [])

  const toggleDarkMode = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem("vinetalk-dark-mode", newDark.toString())
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-white"}`}>
      <nav
        className={`fixed top-0 w-full z-50 border-b transition-colors ${isDark ? "border-slate-800 bg-slate-950/80" : "border-gray-200 bg-white/80"} backdrop-blur-md`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
            Vinetalk
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${isDark ? "bg-slate-800 text-cyan-400 hover:bg-slate-700" : "bg-gray-100 text-slate-700 hover:bg-gray-200"}`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <div
        className={`relative pt-24 pb-12 ${isDark ? "bg-slate-950" : "bg-gradient-to-b from-white via-blue-50/30 to-white"}`}
      >
        <div className="flex justify-center items-center h-32 relative overflow-hidden px-4">
         
          <div className="absolute animate-float-slow" style={{ left: "5%", animationDelay: "0s" }}>
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">📚</span>
            </div>
          </div>

          
          <div className="absolute animate-float" style={{ left: "15%", animationDelay: "0.5s" }}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
            >
              <span className="text-4xl">🤔</span>
            </div>
          </div>

         
          <div className="absolute animate-float-slow" style={{ left: "25%", animationDelay: "1s" }}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isDark ? "bg-slate-800" : "bg-gray-200"}`}
            >
              <span className="text-4xl">😎</span>
            </div>
          </div>

          <div className="absolute animate-float" style={{ left: "35%", animationDelay: "0.3s" }}>
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-4xl">💡</span>
            </div>
          </div>

          
          <div className="absolute animate-float-reverse" style={{ left: "45%", animationDelay: "0s" }}>
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
            >
              <span className="text-5xl">🤖</span>
            </div>
          </div>

        
          <div className="absolute animate-float" style={{ left: "55%", animationDelay: "1s" }}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
            >
              <span className="text-4xl">😄</span>
            </div>
          </div>

         
          <div className="absolute animate-float-slow" style={{ left: "65%", animationDelay: "1.5s" }}>
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🎧</span>
            </div>
          </div>

         
          <div className="absolute animate-float" style={{ left: "75%", animationDelay: "0.7s" }}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-300 bg-gray-100"}`}
            >
              <span className="text-4xl">😊</span>
            </div>
          </div>

         
          <div className="absolute animate-float-reverse" style={{ left: "85%", animationDelay: "0.5s" }}>
            <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-4xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative z-10 flex flex-col items-center justify-center px-4 py-20 ${isDark ? "bg-slate-950" : "bg-white"}`}
      >
        <div className="mb-8 animate-fade-in">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm ${isDark ? "bg-blue-600/10 border-blue-500/40" : "bg-blue-100/50 border-blue-200"}`}
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? "bg-cyan-400" : "bg-cyan-600"}`}></span>
            <span className={`text-sm font-medium ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
              Connect instantly with people worldwide
            </span>
          </div>
        </div>

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-black mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
              Vinetalk
            </span>
          </h1>
          <div
            className={`h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500`}
          ></div>
        </div>

        <h2
          className={`text-3xl md:text-5xl font-black text-center mb-6 leading-tight ${isDark ? "text-slate-50" : "text-slate-950"}`}
        >
          Connect. Chat.{" "}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
            Vibe.
          </span>
        </h2>

        <p className={`text-lg md:text-xl text-center mb-8 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Meet random people through instant video chat. No bots, no endless swiping—just real conversations with real
          people. Vinetalk makes connecting fun, fast, and totally anonymous.
        </p>

       
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in">
          <Button
            onClick={() => navigate("/landing")}
            className="group relative px-8 py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-400/30"
          >
            <span className="flex items-center gap-2">
              Start Chatting
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>

          <Button
            className={`px-8 py-6 text-lg font-bold rounded-lg transition-all duration-300 ${isDark ? "bg-slate-900 border-2 border-purple-600/50 text-purple-300 hover:bg-purple-600/10 hover:border-purple-500/80" : "bg-gray-100 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500"}`}
            variant="outline"
          >
            How it Works
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mb-16 animate-fade-in px-4">
          {[
            {
              icon: "⚡",
              title: "Instant Connect",
              desc: "Get matched with someone in seconds",
              color: "blue",
            },
            {
              icon: "🎥",
              title: "Crystal Quality",
              desc: "HD video & audio for real conversations",
              color: "purple",
            },
            {
              icon: "🔒",
              title: "Totally Private",
              desc: "Stay anonymous and skip whenever",
              color: "cyan",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className={`group p-8 rounded-xl border transition-all duration-300 ${isDark ? `bg-${feature.color}-950/20 border-${feature.color}-500/30 hover:border-${feature.color}-500/60 hover:shadow-lg hover:shadow-${feature.color}-500/20` : `bg-${feature.color}-50 border-${feature.color}-200 hover:border-${feature.color}-400`}`}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-slate-50" : "text-slate-950"}`}>
                {feature.title}
              </h3>
              <p className={`${isDark ? "text-slate-400" : "text-slate-600"}`}>{feature.desc}</p>
            </div>
          ))}
        </div>

      
        <div
          className={`grid grid-cols-3 gap-8 pt-12 border-t w-full max-w-2xl px-4 ${isDark ? "border-blue-500/20" : "border-blue-200"}`}
        >
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
              50K+
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Online Now</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              1M+
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Monthly Users</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent mb-2">
              100%
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-600"}`}>Anonymous</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: float-reverse 3.5s ease-in-out infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}

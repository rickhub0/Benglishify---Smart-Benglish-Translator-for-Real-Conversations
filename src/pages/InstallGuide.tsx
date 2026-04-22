import { Smartphone, Chrome, Compass, Share, MoreVertical, PlusSquare, ArrowLeft, Download, Globe, Box, Info } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
const logo = "https://benglishify.in/logo.png";

export default function InstallGuide() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 flex-1 w-full">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
          {/* Hero Section */}
          <section className="text-center space-y-4 pt-4">
            <motion.div variants={itemVariants} className="inline-flex p-3 bg-blue-100 rounded-2xl mb-2">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
              Get Benglishify on <br className="md:hidden" /> Your Home Screen
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-500 max-w-md mx-auto text-sm md:text-base">
              Follow these simple steps to install Benglishify as an app on your mobile device for instant access.
            </motion.p>
          </section>

          {/* Android Section */}
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Android Guide</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                {[
                  { step: 1, text: "Open Chrome browser", icon: <Chrome className="w-4 h-4" /> },
                  { step: 2, text: "Go to https://benglishify.in" },
                  { step: 3, text: "Tap the three-dot menu (top right)", icon: <MoreVertical className="w-4 h-4" /> },
                  { step: 4, text: "Tap \"Add to Home screen\"", icon: <PlusSquare className="w-4 h-4" /> },
                  { step: 5, text: "Confirm installation" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div className="flex items-center gap-2 text-sm md:text-base text-gray-700 font-medium">
                      {item.text}
                      {item.icon && <span className="text-green-600">{item.icon}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Android Mockup UI */}
              <div className="hidden md:block bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl relative border-4 border-gray-800">
                <div className="bg-white rounded-[2rem] aspect-[9/16] overflow-hidden relative">
                  <div className="bg-gray-100 h-12 flex items-center px-4 gap-2 border-b">
                    <div className="w-full h-6 bg-white rounded-full border px-2 text-[8px] flex items-center text-gray-400">benglishify.in</div>
                    <div className="p-1 bg-blue-100 rounded-full">
                      <MoreVertical className="w-4 h-4 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="w-2/3 h-4 bg-gray-100 rounded shadow-sm" />
                    <div className="w-full h-24 bg-blue-50 rounded-xl" />
                    <div className="space-y-2">
                       <div className="w-full h-3 bg-gray-50 rounded" />
                       <div className="w-full h-3 bg-gray-50 rounded" />
                       <div className="w-full h-3 bg-gray-50 rounded" />
                    </div>
                  </div>
                  {/* Menu Overlay */}
                  <div className="absolute top-12 right-2 w-40 bg-white shadow-2xl rounded-xl border p-2 space-y-1 transform scale-95 origin-top-right">
                    <div className="h-6 rounded hover:bg-gray-50" />
                    <div className="h-6 rounded hover:bg-gray-50" />
                    <div className="h-8 rounded bg-blue-50 border border-blue-100 flex items-center px-2 gap-2">
                      <PlusSquare className="w-3 h-3 text-blue-600" />
                      <span className="text-[8px] font-bold text-blue-600">Add to Home screen</span>
                    </div>
                    <div className="h-6 rounded hover:bg-gray-50" />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* iOS Section */}
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Compass className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">iOS Guide</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* iOS Mockup UI */}
              <div className="hidden md:block bg-gray-400 rounded-[2.5rem] p-3 shadow-2xl relative border-4 border-gray-300 order-2 md:order-1">
                <div className="bg-white rounded-[2rem] aspect-[9/16] overflow-hidden relative flex flex-col">
                  <div className="flex-1 p-4 space-y-6">
                    <div className="flex justify-center">
                      <img src={logo} className="w-12 h-12" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="h-4 w-1/2 bg-gray-100 mx-auto rounded" />
                      <div className="h-10 w-full bg-blue-50 rounded-lg" />
                    </div>
                  </div>
                  {/* Share Tab UI */}
                  <div className="bg-gray-100/90 backdrop-blur-md p-4 space-y-4 border-t border-gray-200">
                    <div className="flex justify-between px-2">
                       <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                       <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                       <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                         <Share className="w-4 h-4 text-blue-600 animate-bounce" />
                       </div>
                       <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                    </div>
                    <div className="bg-white rounded-xl p-2 space-y-2 shadow-sm">
                      <div className="h-8 rounded bg-blue-50 flex items-center px-3 justify-between">
                         <span className="text-[8px] font-bold text-blue-600">Add to Home Screen</span>
                         <PlusSquare className="w-3 h-3 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 order-1 md:order-2">
                {[
                  { step: 1, text: "Open Safari browser", icon: <Compass className="w-4 h-4" /> },
                  { step: 2, text: "Go to https://benglishify.in" },
                  { step: 3, text: "Tap the Share button (bottom center)", icon: <Share className="w-4 h-4" /> },
                  { step: 4, text: "Scroll and tap \"Add to Home Screen\"", icon: <PlusSquare className="w-4 h-4" /> },
                  { step: 5, text: "Tap \"Add\" at the top right" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div className="flex items-center gap-2 text-sm md:text-base text-gray-700 font-medium">
                      {item.text}
                      {item.icon && <span className="text-blue-600">{item.icon}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Availability Section */}
          <motion.section variants={itemVariants} className="pt-12 border-t border-gray-100">
            <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 text-center text-white space-y-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)]" />
               <h3 className="text-2xl font-bold relative z-10">Available on:</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                 {[
                   { name: "Web", icon: <Globe className="w-6 h-6" />, status: "Live" },
                   { name: "Chrome Extension", icon: <Box className="w-6 h-6" />, status: "Live" },
                   { name: "Mobile App", icon: <Smartphone className="w-6 h-6" />, status: "Coming Soon", highlight: true },
                 ].map((item) => (
                   <div key={item.name} className={cn(
                     "p-6 rounded-2xl border transition-all hover:scale-105",
                     item.highlight ? "bg-white/5 border-white/20" : "bg-white/10 border-white/10"
                   )}>
                     <div className="flex justify-center mb-4 text-blue-400">
                       {item.icon}
                     </div>
                     <h4 className="font-bold text-lg mb-1">{item.name}</h4>
                     <span className={cn(
                       "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full",
                       item.status === 'Live' ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                     )}>
                       {item.status}
                     </span>
                   </div>
                 ))}
               </div>
            </div>
          </motion.section>
        </motion.div>
      </main>

  );
}

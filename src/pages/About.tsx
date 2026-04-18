import logo from "/public/logo.png";
import { Info, Sparkles, ArrowRightLeft, Wifi, Github, Instagram, Languages } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <img src={logo} alt="Benglishify Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center">
            <span className="text-gray-900">বেং</span>
            <span className="text-[#C25400]">lish</span>
            <span className="text-gray-900">ify</span>
          </h1>
        </Link>
        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Back to Translator
        </Link>
      </header>

      <main className="flex-1">
        {/* Product Overview & Core Details */}
        <section className="bg-[#fcfcfc] py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
              <div>
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                  Core Details
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tight">
                  Smart Translation <br/> 
                  <span className="text-blue-600">Reimagined.</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  <strong>Benglishify.in</strong> is more than a translator. It is a specialized linguistic platform built for the way 300 million people speak in the digital age. We bridge the gap between traditional scripts and the modern phonetic alphabet used in texting, social media, and international business.
                </p>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    What is Benglish?
                  </h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Benglish is the phonetic representation of the Bengali language using Roman (Latin) characters. It is the &quot;language of the internet&quot; in West Bengal and Bangladesh, often full of unique spelling variations that traditional translators like Google Translate fail to understand accurately.
                  </p>
                </div>
              </div>

              <div className="space-y-12 flex flex-col justify-center">
                <div className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">01</div>
                    <h3 className="text-xl font-bold text-gray-900">Multi-Script Support</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed pl-14">
                    Seamlessly convert between <strong>Bengali Script</strong>, <strong>Phonetic Benglish</strong>, and <strong>Formal English</strong>. Perfect for learning, professional communication, or casual chatting.
                  </p>
                </div>

                <div className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">02</div>
                    <h3 className="text-xl font-bold text-gray-900">Slang & Dialect Awareness</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed pl-14">
                    Our AI is trained on regional dialects (Dhaka, Kolkata, Sylhet) and modern internet slang, ensuring that &quot;tora ki korchis?&quot; turns into natural English, not just a literal word-map.
                  </p>
                </div>

                <div className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">03</div>
                    <h3 className="text-xl font-bold text-gray-900">Grammar & Tone Check</h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed pl-14">
                    Not just a translator, but a style assistant. Benglishify helps fix spelling in both Benglish and English, helping you communicate with confidence across borders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Benglishify Section */}
        <section className="bg-white border-y border-gray-100 py-16 md:py-24 px-4 overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Why Benglishify.in?</h2>
              <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium italic leading-relaxed">
                Bridging the gap between the way we speak and the languages we love.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform relative z-10">
                  <Sparkles className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">AI Context Engine</h3>
                <p className="text-gray-600 text-sm leading-relaxed relative z-10">
                  Most translators fail at Benglish because it&apos;s non-standard. Our engine uses <strong>Gemini 3 AI</strong> to understand slang, abbreviations, and modern social media context.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:shadow-2xl hover:shadow-orange-500/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform relative z-10">
                  <ArrowRightLeft className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">Smart Disambiguation</h3>
                <p className="text-gray-600 text-sm leading-relaxed relative z-10">
                  Words like <em>&quot;kal&quot;</em> can mean yesterday or tomorrow. Benglishify analyzes tense markers and context to give you the perfect translation every single time.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:shadow-2xl hover:shadow-green-500/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform relative z-10">
                  <Wifi className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">Hybrid Intelligence</h3>
                <p className="text-gray-600 text-sm leading-relaxed relative z-10">
                  By combining an <strong>offline phonetic dictionary</strong> with cloud-based AI reasoning, we deliver instant results without ever sacrificing translation accuracy.
                </p>
              </div>
            </div>

            <div className="mt-24 pt-20 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="space-y-10">
                  <div>
                    <h4 className="text-3xl font-black text-gray-900 mb-6">How it works</h4>
                    <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                      Benglishify isn&apos;t just a dictionary; it&apos;s a linguistic bridge designed specifically for the modern Bengali speaker.
                    </p>
                  </div>
                  
                  <ul className="space-y-8">
                    <li className="flex gap-6 group">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 font-bold text-sm group-hover:bg-blue-600 transition-colors shadow-lg">1</div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-lg mb-1">Phonetic Processing</h5>
                        <p className="text-gray-500 text-sm leading-relaxed">We take your Romanized Bengali (Benglish) and map it back to its core phonetic structure using custom algorithms.</p>
                      </div>
                    </li>
                    <li className="flex gap-6 group">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 font-bold text-sm group-hover:bg-orange-600 transition-colors shadow-lg">2</div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-lg mb-1">Contextual Analysis</h5>
                        <p className="text-gray-500 text-sm leading-relaxed">Our AI identifies intent, emotion, and temporal markers to ensure the English version sounds natural and idiomatic.</p>
                      </div>
                    </li>
                    <li className="flex gap-6 group">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 font-bold text-sm group-hover:bg-green-600 transition-colors shadow-lg">3</div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-lg mb-1">Continuous Feedback</h5>
                        <p className="text-gray-500 text-sm leading-relaxed">Every time you suggest a correction, you help the system learn the evolving slang of our vibrant 100M+ community.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="relative">
                  <motion.div 
                    initial={{ rotate: -2 }}
                    whileHover={{ rotate: 0 }}
                    className="bg-gradient-to-br from-[#1a1a1a] to-[#3a3a3a] rounded-[3rem] p-1.5 shadow-2xl overflow-hidden relative"
                  >
                    <div className="bg-[#1a1a1a] rounded-[2.8rem] p-10 md:p-14 overflow-hidden relative">
                      <div className="absolute inset-0 opacity-20 hover:opacity-30 transition-opacity">
                        <img src="https://picsum.photos/seed/bengali-culture/800/600" alt="Culture" className="w-full h-full object-cover mix-blend-overlay grayscale" referrerPolicy="no-referrer" />
                      </div>
                      <div className="relative z-10 text-center space-y-6">
                        <div className="inline-block p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                          <Sparkles className="w-10 h-10 text-blue-400" />
                        </div>
                        <p className="text-xl md:text-2xl font-medium leading-relaxed italic text-white/90">
                          &quot;Finally, a translator that actually speaks like we do in our WhatsApp groups and comments.&quot;
                        </p>
                        <div className="pt-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Our Mission</div>
                          <div className="text-xs text-white/40 font-medium">Empowering local voices globally</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Benglishify.in</h2>
            <p className="text-gray-400 text-xs md:text-sm">© 2026 Benglishify.in for the Bengali community.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/rickhub0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
            <a 
              href="https://www.instagram.com/clickors/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Instagram className="w-5 h-5" />
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

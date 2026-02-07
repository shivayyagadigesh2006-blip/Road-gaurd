import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LandingPageProps {
   onGetStarted: () => void;
   onLogin: () => void;
   onWardLogin: () => void;
   onContractorLogin: () => void;
   stats: {
      total: number;
      resolved: number;
      pending: number;
   };
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onWardLogin, onContractorLogin, stats }) => {
   const { t, language, setLanguage } = useLanguage();

   // Stats Counting Animation
   const [counts, setCounts] = React.useState({ total: 0, resolved: 0, pending: 0 });

   React.useEffect(() => {
      const duration = 2000;
      const steps = 50;
      const intervalTime = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
         currentStep++;
         const progress = currentStep / steps;
         const ease = (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in-out

         setCounts({
            total: Math.round(stats.total * ease(progress)),
            resolved: Math.round(stats.resolved * ease(progress)),
            pending: Math.round(stats.pending * ease(progress))
         });

         if (currentStep >= steps) {
            clearInterval(timer);
            setCounts(stats); // Ensure final match
         }
      }, intervalTime);

      return () => clearInterval(timer);
   }, [stats]);

   return (
      <div className="bg-white min-h-[calc(100vh-200px)] animate-fade-in relative">

         {/* Language Toggle */}
         <div className="absolute top-4 right-4 z-50 flex items-center bg-white rounded-full shadow-md border border-gray-200 p-1">
            <button
               onClick={() => setLanguage('en')}
               className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${language === 'en' ? 'bg-[#1E3A8A] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
               EN
            </button>
            <button
               onClick={() => setLanguage('hi')}
               className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${language === 'hi' ? 'bg-[#EA580C] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
               HI
            </button>
            <button
               onClick={() => setLanguage('mr')}
               className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${language === 'mr' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
               MR
            </button>
         </div>

         {/* Hero Section */}
         <div id="home" className="bg-[#f0f9ff] border-b border-blue-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"> {/* Increased padding */}

               <div className="text-center max-w-4xl mx-auto mb-16 animate-fade-up"> {/* Animated Header */}
                  <span className="inline-block py-1.5 px-4 rounded bg-blue-100 text-[#1E3A8A] text-sm font-bold uppercase tracking-wider mb-6 border border-blue-200 shadow-sm">
                     {t.officialPortal}
                  </span>
                  <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#1E3A8A] leading-tight mb-6 tracking-tight">
                     {t.heroTitle}
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
                     {t.heroSubtitle}
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto relative z-10"> {/* Changed to 3 columns */}
                  {/* Citizen Card */}
                  <div className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col animate-fade-up stagger-1 hover:-translate-y-2 h-full">
                     <div className="h-48 overflow-hidden relative"> {/* Standardized Height */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                        <img
                           src="/assets/citizen_hero.png"
                           alt="Citizen Reporting"
                           className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 bg-orange-600" /* Fallback bg */
                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584463673574-a70404a07677?auto=format&fit=crop&w=800&q=80'; }}
                        />
                        <div className="absolute bottom-6 left-6 z-20">
                           <span className="px-3 py-1 bg-[#EA580C]/90 backdrop-blur-sm text-white text-xs font-bold uppercase rounded mb-2 inline-block shadow-sm">Public Access</span>
                           <h3 className="text-2xl font-bold text-white font-serif tracking-wide shadow-black drop-shadow-md">{t.cardCitizenTitle}</h3>
                        </div>
                     </div>
                     <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 text-sm mb-6 flex-1 leading-relaxed">
                           {t.cardCitizenDesc}
                        </p>
                        <div className="mt-auto">
                           <button
                              onClick={onGetStarted}
                              className="w-full py-3 bg-[#EA580C] text-white rounded font-bold shadow hover:bg-orange-700 transition-all flex items-center justify-center text-base group-hover:shadow-md active:scale-95 duration-200"
                           >
                              <i className="fas fa-camera mr-2 group-hover:rotate-12 transition-transform"></i>
                              {t.btnUpload}
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Department Card */}
                  <div className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col animate-fade-up stagger-2 hover:-translate-y-2 h-full">
                     <div className="h-48 overflow-hidden relative"> {/* Standardized Height */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                        <img
                           src="/assets/dept_hero.png" // Ensure asset exists or styling handles it
                           alt="Department Portal"
                           className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 bg-blue-900" /* Fallback bg */
                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'; }}
                        />
                        <div className="absolute bottom-6 left-6 z-20">
                           <span className="px-3 py-1 bg-[#1E3A8A]/90 backdrop-blur-sm text-white text-xs font-bold uppercase rounded mb-2 inline-block shadow-sm">Official Use Only</span>
                           <h3 className="text-2xl font-bold text-white font-serif tracking-wide shadow-black drop-shadow-md">{t.deptLogin}</h3>
                        </div>
                     </div>
                     <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 text-sm mb-6 flex-1 leading-relaxed">
                           {t.cardDeptDesc}
                        </p>

                        <div className="mt-auto">
                           <button
                              onClick={onLogin}
                              className="w-full py-3 bg-white text-[#1E3A8A] border-2 border-[#1E3A8A] rounded font-bold hover:bg-blue-50 transition-all flex items-center justify-center text-base group-hover:shadow-sm active:scale-95 duration-200"
                           >
                              <i className="fas fa-shield-alt mr-2 group-hover:rotate-12 transition-transform"></i>
                              {t.btnLogin}
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Ward Card */}
                  <div className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col animate-fade-up stagger-3 hover:-translate-y-2 h-full">
                     <div className="h-48 overflow-hidden relative"> {/* Standardized Height */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                        <img
                           src="/assets/ward_hero.png" // Updated to local asset
                           alt="Ward Portal"
                           className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 bg-green-700"
                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'; }}
                        />
                        <div className="absolute bottom-6 left-6 z-20">
                           <span className="px-3 py-1 bg-green-700/90 backdrop-blur-sm text-white text-xs font-bold uppercase rounded mb-2 inline-block shadow-sm">Local Authority</span>
                           <h3 className="text-2xl font-bold text-white font-serif tracking-wide shadow-black drop-shadow-md">{t.wardLogin}</h3>
                        </div>
                     </div>
                     <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 text-sm mb-6 flex-1 leading-relaxed">
                           {t.cardWardDesc}
                        </p>
                        <div className="mt-auto space-y-3">
                           <button
                              onClick={onWardLogin}
                              className="w-full py-3 bg-white text-green-700 border-2 border-green-700 rounded font-bold hover:bg-green-50 transition-all flex items-center justify-center text-base group-hover:shadow-md active:scale-95 duration-200"
                           >
                              <i className="fas fa-map-marked-alt mr-2 group-hover:bounce transition-transform"></i>
                              {t.btnEnter}
                           </button>
                           <button
                              onClick={onContractorLogin}
                              className="w-full py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded font-bold hover:bg-gray-100 hover:text-black transition-all flex items-center justify-center text-sm uppercase tracking-wide active:scale-95 duration-200 group/btn"
                           >
                              <i className="fas fa-hard-hat mr-2 text-amber-600 group-hover/btn:rotate-12 transition-transform"></i>
                              {t.contractorPortal}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Stats Bar */}
               <div id="about" className="mt-16 max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 grid grid-cols-3 divide-x divide-gray-100 animate-fade-in stagger-4 hover:shadow-md transition-shadow duration-300">
                  <div className="text-center px-4 group cursor-default">
                     <p className="text-4xl font-bold text-[#1E3A8A] group-hover:scale-110 transition-transform duration-300 inline-block">{counts.total}</p>
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wide mt-1">{t.statTotal}</p>
                  </div>
                  <div className="text-center px-4 group cursor-default">
                     <p className="text-4xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-300 inline-block">{counts.resolved}</p>
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wide mt-1">{t.statFixed}</p>
                  </div>
                  <div className="text-center px-4 group cursor-default">
                     <p className="text-4xl font-bold text-[#EA580C] group-hover:scale-110 transition-transform duration-300 inline-block">{counts.pending}</p>
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wide mt-1">{t.statPending}</p>
                  </div>
               </div>

            </div>
         </div>

         {/* Services/Info Section */}
         <div id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16 animate-fade-up">
               <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">{t.servicesTitle}</h2>
               <div className="h-1.5 w-24 bg-[#EA580C] mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
               <div className="p-8 bg-white border border-gray-200 rounded hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-up stagger-1">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[#1E3A8A] mb-6">
                     <i className="fas fa-camera text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t.service1Title}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                     {t.service1Desc}
                  </p>
               </div>
               <div className="p-8 bg-white border border-gray-200 rounded hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-up stagger-2">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-[#EA580C] mb-6">
                     <i className="fas fa-robot text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t.service2Title}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                     {t.service2Desc}
                  </p>
               </div>
               <div className="p-8 bg-white border border-gray-200 rounded hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-up stagger-3">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-700 mb-6">
                     <i className="fas fa-tasks text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t.service3Title}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                     {t.service3Desc}
                  </p>
               </div>
            </div>
         </div>

      </div>
   );
};

export default LandingPage;

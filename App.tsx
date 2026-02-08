import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, UserRole, RoadReport, ReportStatus, Severity } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { getGPSFromImage } from './utils/gpsUtils';
import Layout from './components/Layout';
import { useLanguage } from './contexts/LanguageContext';
import LocationPicker from './components/LocationPicker';
import ReportCard from './components/ReportCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LandingPage from './components/LandingPage';
import ContractorDashboard from './components/ContractorDashboard';
import DepartmentDashboard from './components/DepartmentDashboard';
import WardDashboard from './components/WardDashboard';

// --- Speech Recognition Interfaces ---
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

// Extend Window interface for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

type RiskCategory = 'ALL' | 'CRITICAL' | 'MODERATE' | 'LOW';
type CorpTab = 'TOTAL' | 'CRITICAL' | 'RESOLVED' | 'PENDING';
type UploadTab = 'IMAGE' | 'VIDEO';
type LoginType = 'USER' | 'CORPORATION' | 'CONTRACTOR' | 'WARD';

const App: React.FC = () => {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginType, setLoginType] = useState<LoginType>('USER');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [imageLocation, setImageLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [manualLocation, setManualLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Filters
  const [activeCorpTab, setActiveCorpTab] = useState<CorpTab>('TOTAL');
  const [activeUploadTab, setActiveUploadTab] = useState<UploadTab>('IMAGE');
  const [uploadDescription, setUploadDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState(''); // Manual location address input
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (keep other state hooks unchanged)

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setImageLocation(null); // Reset previous image location
      setManualLocation(null); // Reset manual override when new file selected

      // Try to get GPS from image
      if (file.type.startsWith('image/')) {
        try {
          const gps = await getGPSFromImage(file);
          if (gps) {
            setImageLocation(gps);
            console.log("Extracted GPS from image:", gps);
          } else {
            // Notify user if no GPS found to explain why fallback is used
            alert("No GPS data found in this image. Using device location.");
          }
        } catch (err) {
          console.error("Failed to extract GPS", err);
        }
      }

      // Clear value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  // --- Voice Input Logic ---
  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice-to-Text. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one sentence/pause
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Default to English, could be dynamic based on current language

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUploadDescription(prev => (prev ? prev + ' ' + transcript : transcript)); // Append to existing text
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const submitAnalysis = async () => {
    if (!currentUser) {
      setError("Session expired. Please log in again.");
      return;
    }
    if (!selectedFile) return;

    const file = selectedFile;
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError(`File size exceeds 100MB limit.`);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      let currentLoc = userLocation;
      if (!currentLoc && "geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
          );
          currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(currentLoc);
        } catch (e) { console.log('Loc req failed'); }
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const analysis = await geminiService.analyzeRoadCondition(base64Data, file.type);

          let mediaUrl = base64Data;
          if (analysis.originalMediaUrl) {
              const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
              mediaUrl = analysis.originalMediaUrl.startsWith('/') 
                  ? `${backendUrl}${analysis.originalMediaUrl}` 
                  : analysis.originalMediaUrl;
              
              if (analysis.processedMediaUrl && analysis.processedMediaUrl.startsWith('/')) {
                  analysis.processedMediaUrl = `${backendUrl}${analysis.processedMediaUrl}`;
              }
          }

          const newReport: RoadReport = {
            id: Math.random().toString(36).substr(2, 9),
            userId: currentUser.id,
            userName: currentUser.username,
            timestamp: Date.now(),
            mediaUrl: mediaUrl,
            mediaType: file.type.startsWith('video/') ? 'video' : 'image',
            analysis,
            status: ReportStatus.PENDING,
            location: manualLocation || analysis.location || imageLocation || currentLoc || undefined,
            locationAddress: locationAddress.trim() || undefined, // Add manual address
            userDescription: uploadDescription.trim() || undefined,
            department: analysis.department // Auto-routed by AI
          };

          const saved = await storageService.saveReport(newReport);
          if (!saved) {
            setError("Failed to save report.");
          } else {
            setReports(prev => [newReport, ...prev]);
            setUploadSuccess(true);

            // Text-to-Speech Feedback
            const messages = {
              en: `Report submitted successfully to the ${newReport.department || 'Roads Department'}.`,
              hi: `आपकी रिपोर्ट ${newReport.department || 'सड़क विभाग'} को सफलतापूर्वक भेज दी गई है।`,
              mr: `तुमचा अहवाल ${newReport.department || 'रस्ते विभागाला'} यशस्वीरित्या सादर करण्यात आला आहे.`
            };

            const msg = new SpeechSynthesisUtterance(messages[language as 'en' | 'hi' | 'mr'] || messages.en);
            msg.lang = language === 'hi' ? 'hi-IN' : (language === 'mr' ? 'mr-IN' : 'en-US');
            window.speechSynthesis.speak(msg);

            setTimeout(() => setUploadSuccess(false), 3000);
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadDescription(''); // Reset description
          setLocationAddress(''); // Reset location address
          setSelectedFile(null); // Reset selection

          // DO NOT auto-switch to CRITICAL.
        } catch (err: any) {
          setError(err.message || "Analysis Service Error");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.onerror = () => {
        setError("File read error.");
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Analysis initiation failed.");
      setIsAnalyzing(false);
    }
  };

  // Splash & Landing State
  const [showSplash, setShowSplash] = useState(true);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoadingReports(true);
      const data = await storageService.getReports();
      setReports(data);
      setIsLoadingReports(false);
    };
    loadReports();

    // Simple Govt Splash Timeout (only run once)
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setShowLanding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]); // Reload reports when user changes (Login/Logout) to ensure fresh data (assignments etc)

  // Request location when user logs in
  useEffect(() => {
    refreshLocation();
  }, [currentUser]);

  const refreshLocation = () => {
    setError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.warn("Location access denied or unavailable.", err);
          let msg = "Location error.";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = "Permission denied. Check Browser or OS Privacy settings.";
              break;
            case err.POSITION_UNAVAILABLE:
              msg = "Location unavailable. Check GPS signal.";
              break;
            case err.TIMEOUT:
              msg = "Location request timed out.";
              break;
            default:
              msg = "Location access failed.";
          }
          setError(msg);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  // AI Analyzing feedback loop
  useEffect(() => {
    let interval: number;
    const steps = [
      "Uploading to Central Server...",
      "Verifying Geospatial Data...",
      "Processing Visual Evidence...",
      "Assessing Infrastructure Integrity...",
      "Checking Compliance Standards...",
      "Generating Official Report..."
    ];

    if (isAnalyzing) {
      setAnalyzingProgress(0);
      setAnalyzingStep(steps[0]);
      interval = window.setInterval(() => {
        setAnalyzingProgress(prev => {
          const next = prev < 99 ? Math.min(prev + Math.random() * 5, 99) : prev;
          const stepIndex = Math.min(Math.floor((next / 100) * steps.length), steps.length - 1);
          setAnalyzingStep(steps[stepIndex]);
          return next;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Scroll to top on navigation change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [showLanding, authMode, loginType, currentUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        if (!username.trim()) {
          setError("Please enter a valid Name/ID.");
          setIsLoggingIn(false);
          return;
        }

      const role = loginType === 'CORPORATION' || loginType === 'WARD' ? UserRole.CORPORATION : (loginType === 'CONTRACTOR' ? UserRole.CONTRACTOR : UserRole.USER);
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username,
        email: email.toLowerCase(),
        password,
        role,
        department: undefined,
        phone: loginType === 'USER' ? phone : undefined,
        city: loginType === 'USER' ? city : undefined,
      };

      const success = await storageService.register(newUser);
      if (!success) {
        setError("Registration failed. Email may already be registered.");
        return;
      }
      const loggedInUser = await storageService.login(email, password);
      if (loggedInUser) {
        setCurrentUser(loggedInUser);
        setError(null);
        return;
      }
    }

    const user = await storageService.login(email, password);

    if (user) {
      if ((user.role === UserRole.CORPORATION || user.role === UserRole.ADMIN) && (loginType !== 'CORPORATION' && loginType !== 'WARD')) {
        setError("Restricted Access: Use Department Login.");
        return;
      }
      if (user.role === UserRole.CONTRACTOR && loginType !== 'CONTRACTOR') {
        setError("Restricted Access: Use Contractor Login.");
        return;
      }
      if (user.role === UserRole.USER && loginType !== 'USER') {
        setError("Invalid Login Portal.");
        return;
      }

      setCurrentUser(user);
      setError(null);
    } else {
      setError("Invalid credentials. Please try again.");
    }
  } catch (err) {
    setError("An unexpected error occurred.");
  } finally {
    setIsLoggingIn(false);
  }
  };



  const handleStatusUpdate = async (id: string, status: ReportStatus, repairMediaUrl?: string) => {
    await storageService.updateReportStatus(id, status, repairMediaUrl);
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          repairMediaUrl: repairMediaUrl || r.repairMediaUrl,
          resolvedTimestamp: status === ReportStatus.FIXED ? (Date.now() / 1000) : r.resolvedTimestamp
        };
      }
      return r;
    }));
  };

  const filteredReports = useMemo(() => {
    if (!currentUser) return [];

    console.log("Filtering reports for user:", currentUser);
    console.log("Total reports available:", reports.length);
    if (reports.length > 0) {
      console.log("Sample report department:", reports[0].department);
    }

    let result: RoadReport[] = [];

    const isCorpView = currentUser.role === UserRole.CORPORATION || currentUser.role === UserRole.ADMIN;

    if (isCorpView) {
      let relevantReports = reports;

      if (currentUser.department) {
        relevantReports = reports.filter(r => r.department === currentUser.department);
      }

      switch (activeCorpTab) {
        case 'CRITICAL': result = relevantReports.filter(r => r.status !== ReportStatus.FIXED && (r.analysis?.severity ?? 0) >= Severity.SEVERE); break;
        case 'RESOLVED': result = relevantReports.filter(r => r.status === ReportStatus.FIXED); break;
        case 'PENDING': result = relevantReports.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS); break;
        default: result = relevantReports;
      }
    } else {
      const myReports = reports.filter(r => r.userId === currentUser.id);

      switch (activeCorpTab) {
        case 'CRITICAL': result = myReports.filter(r => r.status !== ReportStatus.FIXED && (r.analysis?.severity ?? 0) >= Severity.SEVERE); break;
        case 'RESOLVED': result = myReports.filter(r => r.status === ReportStatus.FIXED); break;
        case 'PENDING': result = myReports.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS); break;
        default: result = myReports;
      }
    }

    // Sort by Date (Newest to Oldest) so users see their uploads immediately
    return result.sort((a, b) => b.timestamp - a.timestamp);

  }, [reports, currentUser, activeCorpTab]);

  const stats = useMemo(() => {
    let relevant = reports;
    if (currentUser && (currentUser.role === UserRole.CORPORATION || currentUser.role === UserRole.ADMIN)) {
      if (currentUser.department) {
        relevant = reports.filter(r => r.department === currentUser.department);
      }
    }

    return {
      total: relevant.length,
      critical: relevant.filter(r => r.status !== ReportStatus.FIXED && (r.analysis?.severity ?? 0) >= Severity.SEVERE).length,
      resolved: relevant.filter(r => r.status === ReportStatus.FIXED).length,
      pending: relevant.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS).length
    };
  }, [reports, currentUser]);

  const handlePageNavigation = (section: string) => {
    setShowLanding(true);
    // Allow time for state update and render
    setTimeout(() => {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSwitchPortal = (type: LoginType) => {
    setCurrentUser(null);
    setLoginType(type);
    setAuthMode('login');
    setShowLanding(false);
  };

  // RENDER: Govt Splash Screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center animate-fade-in">
          {/* Emblem / Logo */}
          <div className="w-24 h-24 mb-6">
            <img
              src="/assets/logo.png"
              alt="Solapur Municipal Corporation Emblem"
              className="w-full h-full object-contain opacity-80"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <h1 className="text-3xl font-serif font-bold text-[#1E3A8A] mb-2 text-center">Solapur Municipal Corporation</h1>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">Road Condition Monitoring System</p>

          <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#EA580C] animate-[width_2s_ease-out] w-full origin-left"></div>
          </div>
          <p className="mt-4 text-xs font-medium text-gray-400">Loading Secure Portal...</p>
        </div>
      </div>
    );
  }

  // RENDER: Landing Page
  if (showLanding) {
    return (
      <Layout user={null} onLogout={() => { }}>
        <LandingPage
          onGetStarted={() => { setShowLanding(false); setAuthMode('signup'); setLoginType('USER'); }}
          onLogin={() => { setShowLanding(false); setAuthMode('login'); setLoginType('CORPORATION'); }}
          onWardLogin={() => { setShowLanding(false); setAuthMode('login'); setLoginType('WARD'); }}
          onContractorLogin={() => { setShowLanding(false); setAuthMode('login'); setLoginType('CONTRACTOR'); }}
          stats={stats}
        />
      </Layout>
    );
  }

  // RENDER: Authentication
  if (!currentUser) {
    return (
      <Layout user={null} onLogout={() => { }} onNavigate={handlePageNavigation}>
        <div className="max-w-md mx-auto my-12">
          <div className="bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-200 p-6 text-center">
              <h2 className="text-xl font-serif font-bold text-[#1E3A8A] mb-1">
                {loginType === 'USER' ? 'Citizen Sign In' : (loginType === 'WARD' ? 'Ward Official Login' : (loginType === 'CONTRACTOR' ? 'Contractor Login' : 'Department Login'))}
              </h2>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">
                {loginType === 'USER' ? 'Solapur Municipal Corporation' : (loginType === 'WARD' ? 'Local Ward Access' : (loginType === 'CONTRACTOR' ? 'Authorized Contractor Access' : 'Official Portal Access'))}
              </p>
            </div>

            <div className="p-8">
              <form onSubmit={handleAuth} className="space-y-5">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}

                {authMode === 'signup' && loginType === 'USER' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">City / District</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Mumbai, Bangalore"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoggingIn}
                  className={`w-full btn-govt-primary py-3 flex justify-center items-center ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoggingIn ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    authMode === 'login' ? 'Login' : 'Register Account'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col space-y-3 text-center">
                {loginType !== 'CORPORATION' && loginType !== 'WARD' && loginType !== 'CONTRACTOR' && (
                  <button
                    onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }}
                    className="text-sm font-bold text-[#1E3A8A] hover:underline"
                  >
                    {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                  </button>
                )}
                <button
                  onClick={() => { setLoginType(loginType === 'USER' ? 'CORPORATION' : 'USER'); setError(null); }}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 uppercase"
                >
                  Switch to {loginType === 'USER' ? 'Department' : 'Citizen'} Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isOfficial = currentUser.role === UserRole.CORPORATION || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTOR;
  const isCorp = currentUser.role === UserRole.CORPORATION || currentUser.role === UserRole.ADMIN;
  const isContractor = currentUser.role === UserRole.CONTRACTOR;

  // RENDER: Dashboard Logic
  // We determine which dashboard to show based on Role and Login Context

  if (currentUser.role === UserRole.CONTRACTOR) {
    return (
      <Layout user={currentUser} onLogout={() => setCurrentUser(null)} onSwitchPortal={handleSwitchPortal}>
        <ContractorDashboard
          user={currentUser}
          reports={reports}
          onStatusUpdate={handleStatusUpdate}
        />
      </Layout>
    );
  }

  // Corporation Role can be Department (Dept Login) or Ward (Ward Login)
  if (currentUser.role === UserRole.CORPORATION || currentUser.role === UserRole.ADMIN) {
    // Strict Check: Only show Ward Dashboard if the user is ACTUALLY a Ward User
    // We determine this by the username convention "Ward_..."
    if (currentUser.username.startsWith('Ward')) {
      return (
        <Layout user={currentUser} onLogout={() => setCurrentUser(null)} onSwitchPortal={handleSwitchPortal}>
          <WardDashboard
            user={currentUser}
            reports={reports}
            onStatusUpdate={handleStatusUpdate}
          />
        </Layout>
      );
    }
    // Otherwise, default to Department Dashboard (e.g., Roads_Department, Drainage_Department)
    return (
      <Layout user={currentUser} onLogout={() => setCurrentUser(null)} onSwitchPortal={handleSwitchPortal}>
        <DepartmentDashboard
          user={currentUser}
          reports={reports}
          onStatusUpdate={handleStatusUpdate}
        />
      </Layout>
    );
  }

  // DEFAULT: Citizen Dashboard (Inline for now as it wasn't requested to be moved, but could be refactored too)
  return (
    <Layout user={currentUser} onLogout={() => setCurrentUser(null)} onSwitchPortal={handleSwitchPortal}>
      <div className="space-y-10 animate-fade-in">
        {/* User Dashboard Header */}
        <div className="relative rounded-xl overflow-hidden p-8 md:p-10 shadow-sm border border-gray-100 bg-gradient-to-r from-orange-50 to-white">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-5 pointer-events-none">
            <i className="fas fa-users text-[180px] text-gray-800"></i>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-orange-100 text-orange-800 border-orange-200">
                <i className="fas fa-hand-holding-heart mr-2"></i>
                Public Access
              </div>
              <h2 className="text-4xl font-serif font-bold text-gray-900 mb-2">
                Citizen Reporting Portal
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl">
                Welcome back, <span className="font-bold text-[#1E3A8A]">{currentUser.username}</span>.
                Your contributions directly improve road safety in your district.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section (Citizen Only) */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">New Report</h3>
              <p className="text-base text-gray-600 mb-8 leading-relaxed">
                To report a road defect, select the media type and upload. Ensure clear visibility of the pothole or damage.
              </p>

              <div className="flex space-x-3 mb-8">
                <button
                  onClick={() => { setActiveUploadTab('IMAGE'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold uppercase rounded border transition-colors ${activeUploadTab === 'IMAGE' ? 'bg-blue-50 text-[#1E3A8A] border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  <i className="fas fa-camera mr-2"></i> Photo
                </button>
                <button
                  onClick={() => { setActiveUploadTab('VIDEO'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold uppercase rounded border transition-colors ${activeUploadTab === 'VIDEO' ? 'bg-blue-50 text-[#1E3A8A] border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  <i className="fas fa-video mr-2"></i> Video
                </button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-10 text-center transition-all bg-gray-50 border-gray-300 hover:border-[#1E3A8A] hover:bg-blue-50/30">
                {uploadSuccess ? (
                  <div className="flex flex-col items-center animate-bounce py-8">
                    <i className="fas fa-check-circle text-5xl text-green-600 mb-3"></i>
                    <span className="text-xl font-bold text-green-700">Submitted Successfully!</span>
                    <p className="text-sm text-gray-500 mt-2">Your report has been logged.</p>
                  </div>
                ) : !selectedFile ? (
                  <div
                    onClick={triggerFileSelect}
                    className="cursor-pointer py-8"
                  >
                    <div className="flex flex-col items-center">
                      <i className={`fas ${activeUploadTab === 'IMAGE' ? 'fa-cloud-upload-alt' : 'fa-video'} text-5xl text-gray-300 mb-4`}></i>
                      <span className="text-xl font-bold text-gray-700">Select {activeUploadTab === 'IMAGE' ? 'Photo' : 'Video'} to Analyze</span>
                      <span className="text-sm text-gray-400 mt-2">Supports JPG, PNG, MP4 (Max 50MB)</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
                    <div className="flex items-center space-x-3 mb-6 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                      <i className={`fas ${activeUploadTab === 'IMAGE' ? 'fa-file-image' : 'fa-file-video'} text-blue-600 text-xl`}></i>
                      <span className="font-bold text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-red-500 ml-2"
                        title="Remove file"
                      >
                        <i className="fas fa-times-circle"></i>
                      </button>
                    </div>



                    <div className="relative mb-6">
                      <textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Describe the issue... (e.g. 'Deep pothole on Main St')"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base h-32 resize-none shadow-inner pr-12"
                      />
                      <button
                        onClick={toggleListen}
                        title="Voice Dictation"
                        className={`absolute top-2 right-2 p-2 rounded-full transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'}`}
                      >
                        <i className={`fas fa-microphone ${isListening ? 'fa-beat' : ''}`}></i>
                      </button>
                    </div>

                    <LocationPicker
                      initialLocation={imageLocation || userLocation}
                      imageLocation={imageLocation}
                      deviceLocation={userLocation}
                      onLocationChange={(loc) => setManualLocation(loc)}
                      onRefresh={refreshLocation}
                    />

                    {/* Location Address Input */}
                    <div className="relative mb-6 mt-6">
                      <div className="flex items-center mb-2">
                        <i className="fas fa-map-marker-alt text-blue-600 mr-2"></i>
                        <label className="text-sm font-semibold text-gray-700">Location Address (Optional)</label>
                      </div>
                      <input
                        type="text"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Enter location address (e.g. 'Near City Hall, Main Road, Solapur')"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base shadow-inner"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        Provide the exact location to help authorities locate the issue faster
                      </p>
                    </div>

                    {error && (
                      <div className="mb-6 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center animate-pulse">
                        <i className="fas fa-exclamation-triangle mr-1.5"></i>
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      onClick={submitAnalysis}
                      disabled={isAnalyzing}
                      className={`w-full flex items-center justify-center space-x-3 px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${isAnalyzing ? 'opacity-75 cursor-wait' : ''}`}
                    >
                      {isAnalyzing ? (
                        <>
                          <i className="fas fa-circle-notch fa-spin"></i>
                          <span>Analyzing... {analyzingProgress.toFixed(0)}%</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane text-lg"></i>
                          <span className="font-bold text-lg">Submit Report</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={activeUploadTab === 'IMAGE' ? "image/*" : "video/*"}
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#f8fafc] rounded-lg border border-gray-100 p-8 flex flex-col justify-center items-center text-center">
              <div className="max-w-xl">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6 border border-gray-200">
                  <i className="fas fa-shield-alt text-3xl text-[#EA580C]"></i>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{t.govtAssuranceTitle}</h4>
                <p className="text-base text-gray-600 leading-relaxed">
                  {t.govtAssuranceDesc}
                </p>
              </div>
            </div>
          </div>
        </section >

        {/* Report Grid (Citizen) */}
        < div className="pb-20" >
          <div className="border-b border-gray-200 flex space-x-8 mb-8 overflow-x-auto">
            {['TOTAL', 'CRITICAL', 'RESOLVED', 'PENDING'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveCorpTab(tab as CorpTab)}
                className={`pb-4 text-sm font-bold uppercase tracking-wide transition-all border-b-3 whitespace-nowrap ${activeCorpTab === tab ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'TOTAL' ? t.statTotal : tab === 'PENDING' ? t.statPending : tab}
              </button>
            ))}
          </div>

          {
            isLoadingReports ? (
              <div className="p-12 text-center text-gray-400">
                <i className="fas fa-circle-notch fa-spin text-2xl mb-4"></i>
                <p>Loading records...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded p-12 text-center">
                <p className="text-gray-500 font-medium">No records found matching the criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report, index) => (
                  <div key={report.id} className={`animate-fade-up stagger-${(index % 5) + 1}`}>
                    <ReportCard
                      report={report}
                      userRole={currentUser.role}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  </div>
                ))}
              </div>
            )
          }
        </div >
      </div >
    </Layout >
  );
};

export default App;

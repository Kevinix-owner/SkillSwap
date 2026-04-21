import { useState, useEffect, FormEvent } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './lib/firebase';
import { skillSwapService, UserProfile, SkillOffer } from './services/skillSwapService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Clock, 
  Plus, 
  Search, 
  LogOut, 
  TrendingUp,
  Award,
  Calendar,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';

// Views
type View = 'landing' | 'browse' | 'dashboard' | 'profile' | 'create-skill' | 'auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [skills, setSkills] = useState<SkillOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await skillSwapService.getOrCreateUserProfile(u);
          setProfile(p);
          setCurrentView('dashboard');
        } catch (err) {
          console.error("Profile sync failed", err);
        }
      } else {
        setProfile(null);
        setCurrentView('landing');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const s = await skillSwapService.getSkills();
        setSkills(s);
      } catch (err) {
        console.error("Fetch skills failed", err);
      }
    };
    fetchSkills();
  }, [currentView]); // Refetch when view changes to catch newly added skills

  const handleSignIn = async () => {
    try {
      const { signInWithGoogle } = await import('./lib/firebase');
      const user = await signInWithGoogle();
      // If user is null, it means they cancelled the popup (already handled in firebase.ts)
      if (user) {
        setCurrentView('dashboard');
      }
    } catch (err: any) {
      // General safety for unhandled rejections if firebase.ts somehow misses one
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.warn("Sign-in cancelled by user.");
      } else {
        alert("Sign-in failed. Please try again.");
      }
    }
  };

  const handleSignOut = () => auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-ink/10">
      <Navbar 
        user={user} 
        profile={profile} 
        currentView={currentView} 
        setView={setCurrentView} 
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main className="max-w-[1400px] mx-auto min-h-[calc(100vh-90px)]">
        <AnimatePresence mode="wait">
          {currentView === 'landing' && <LandingView key="landing" onStart={() => setCurrentView('auth')} />}
          {currentView === 'auth' && <AuthView key="auth" onAuthSuccess={() => setCurrentView('dashboard')} />}
          {currentView === 'browse' && (
            <BrowseView 
              key="browse"
              skills={skills} 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              user={user}
              setView={setCurrentView}
            />
          )}
          {currentView === 'dashboard' && profile && (
            <DashboardView key="dashboard" profile={profile} setView={setCurrentView} />
          )}
          {currentView === 'profile' && profile && (
            <ProfileView key="profile" profile={profile} />
          )}
          {currentView === 'create-skill' && user && (
            <CreateSkillView key="create-skill" user={user} onSuccess={() => setCurrentView('browse')} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Components ---

function Navbar({ user, profile, currentView, setView, onSignIn, onSignOut }: any) {
  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-ink px-12">
      <div className="max-w-[1400px] mx-auto h-[90px] flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setView(user ? 'dashboard' : 'landing')}
        >
          <span className="font-serif font-bold text-4xl tracking-tighter transition-transform hover:scale-105">SkillSwap.</span>
        </div>

        <div className="flex items-center gap-12">
          {user ? (
            <>
              <nav className="hidden md:flex items-center gap-8 font-extrabold text-[11px] uppercase tracking-[0.2em] opacity-80">
                <button 
                  onClick={() => setView('browse')}
                  className={`hover:opacity-100 transition-opacity ${currentView === 'browse' ? 'opacity-100 border-b-2 border-ink' : 'opacity-60'}`}
                >
                  EXCHANGE
                </button>
                <button 
                  onClick={() => setView('dashboard')}
                  className={`hover:opacity-100 transition-opacity ${currentView === 'dashboard' ? 'opacity-100 border-b-2 border-ink' : 'opacity-60'}`}
                >
                  DASHBOARD
                </button>
              </nav>

              <div className="flex items-center gap-6 pl-12 border-l border-ink/20">
                <div className="bg-ink text-paper px-6 py-2 rounded-full font-extrabold text-[11px] uppercase tracking-[0.1em] flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{profile?.credits || 0} CREDITS</span>
                  </div>
                  <div className="w-[1px] h-3 bg-paper/20" />
                  <span className="opacity-60 italic font-normal normal-case">+{user.displayName?.split(' ')[0] || 'User'}</span>
                </div>
                
                <button onClick={() => setView('profile')} className="hover:grayscale transition-all">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-10 h-10 border border-ink" />
                  ) : (
                    <div className="w-10 h-10 border border-ink bg-ink text-paper flex items-center justify-center font-serif">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                </button>
                <button title="Logout" onClick={onSignOut} className="opacity-40 hover:opacity-100 transition-opacity ml-2">
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={() => setView('auth')}
              className="bg-ink text-paper px-8 py-3 font-extrabold text-xs uppercase tracking-[0.2em] border border-ink hover:bg-paper hover:text-ink transition-colors"
            >
              SIGN IN
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function AuthView({ onAuthSuccess }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      const { signInWithGoogle } = await import('./lib/firebase');
      const u = await signInWithGoogle();
      if (u) onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.warn("Sign-in cancelled.");
      } else {
        setError(err.message || "Google Authentication failed.");
      }
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('./lib/firebase');
      const { auth } = await import('./lib/firebase');
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const provisionTestUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('./lib/firebase');
      const testEmail = "John-Doe@test.com";
      const testPass = "JohndoeTestuser1@";
      
      try {
        // Try login first
        await signInWithEmailAndPassword(auth, testEmail, testPass);
      } catch (loginErr: any) {
        // If user not found OR invalid credential (which could mean not found with enumeration protection)
        // attempt to create the account.
        if (
          loginErr.code === 'auth/user-not-found' || 
          loginErr.code === 'auth/invalid-credential' ||
          loginErr.code === 'auth/invalid-email'
        ) {
          try {
            const cred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
            if (cred.user) {
              const { updateProfile } = await import('firebase/auth');
              await updateProfile(cred.user, { displayName: "John Doe" });
            }
          } catch (createErr: any) {
            // If creation fails, it's likely because the provider is disabled
            if (createErr.code === 'auth/operation-not-allowed') {
              throw new Error("Email/Password login is not enabled in your Firebase Console. Please enable it in the 'Sign-in method' tab.");
            } else if (createErr.code === 'auth/invalid-credential') {
              // Sometimes invalid-credential is returned if the configuration is incomplete
              throw new Error("Authentication error. Ensure Email/Password provider is enabled in Firebase Console.");
            }
            throw createErr;
          }
        } else {
          throw loginErr;
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-[1400px] mx-auto min-h-[calc(100vh-90px)] grid grid-cols-1 md:grid-cols-[1.2fr_1fr]"
    >
      <div className="p-16 md:p-32 border-r border-ink flex flex-col justify-center">
        <div className="label-caps mb-8">Access the Registry</div>
        <h2 className="text-6xl md:text-8xl font-serif font-bold italic tracking-tighter leading-none mb-12">
          Identify yourself.
        </h2>
        
        <form onSubmit={handleEmailAuth} className="space-y-8 max-w-md">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="label-caps block">Email Address</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-serif text-2xl focus:border-ink transition-colors"
                placeholder="reader@skillswap.com"
              />
            </div>
            <div>
              <label className="label-caps block">Vault Key</label>
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-serif text-2xl focus:border-ink transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="bg-ink text-paper py-5 px-12 font-extrabold text-xs uppercase tracking-[0.2em] border border-ink hover:bg-paper hover:text-ink transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : (isLogin ? 'ENTER REGISTRY' : 'ESTABLISH IDENTITY')}
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-extrabold uppercase tracking-[0.1em] opacity-40 hover:opacity-100 transition-opacity"
            >
              {isLogin ? "DON'T HAVE AN IDENTITY? REGISTER" : "ALREADY DOCUMENTED? SIGN IN"}
            </button>
          </div>
        </form>

        <div className="mt-16 flex flex-col gap-8 border-t border-ink/10 pt-16">
          <div className="label-caps">Alternative Methods</div>
          <button 
            onClick={handleGoogleAuth}
            className="flex items-center justify-center gap-4 border border-ink py-5 px-12 font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-paper transition-all"
          >
            Authenticate with Google
          </button>
          
          <div className="p-8 bg-ink/5 border border-ink/10">
            <div className="label-caps mb-4">Quick Entry</div>
            <button 
              onClick={provisionTestUser}
              className="text-[11px] font-bold underline underline-offset-4 opacity-60 hover:opacity-100"
            >
              Login as Test User (John Doe)
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col p-16 md:p-32 bg-ink text-paper justify-center">
        <blockquote className="space-y-8">
          <p className="text-4xl font-serif italic leading-relaxed opacity-80">
            "We believe that knowledge is the only currency that increases when spent."
          </p>
          <footer className="label-caps !text-paper/40 italic font-normal tracking-normal text-lg">
            — The SkillSwap Syndicate
          </footer>
        </blockquote>
      </div>
    </motion.div>
  );
}

function LandingView({ onStart }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-[1.8fr_1.fr] border-b border-ink h-[calc(100vh-90px)]"
    >
      <div className="p-16 md:p-32 border-r border-ink flex flex-col justify-center">
        <div className="label-caps italic font-normal tracking-normal text-lg mb-8 opacity-100">
          Peer-to-peer timezone economy
        </div>
        <h1 className="text-7xl md:text-[9rem] font-serif font-bold italic tracking-tighter leading-[0.85] mb-12">
          Trade your <span className="underline decoration-1 underline-offset-[16px]">hours</span> for <span className="italic font-normal">knowledge.</span>
        </h1>
        <p className="text-xl opacity-60 max-w-xl mb-16 leading-relaxed">
          The marketplace where everyone's time is equal. Teach for an hour, earn a credit. Spend a credit, learn for an hour. Truly moneyless.
        </p>
        <div className="flex gap-8">
          <button 
            onClick={onStart}
            className="bg-ink text-paper px-12 py-5 font-extrabold text-sm uppercase tracking-[0.2em] border border-ink hover:bg-paper hover:text-ink transition-all"
          >
            Claim 2 Starter Credits
          </button>
        </div>
      </div>

      <div className="hidden md:flex flex-col">
        {[
          { title: "Time as Currency", desc: "1 hour of teaching = 1 credit. Forever." },
          { title: "Trust & Territory", desc: "Peer reviews and verified sessions build credibility." },
          { title: "Mutual Growth", desc: "Access high-quality mentors for zero financial cost." }
        ].map((feat, i) => (
          <div key={i} className={`flex-1 p-16 flex flex-col justify-center ${i < 2 ? 'border-b border-ink' : ''}`}>
            <div className="label-caps">FEATURE {i + 1}</div>
            <h3 className="font-serif text-3xl font-bold mb-4">{feat.title}</h3>
            <p className="text-sm opacity-60 leading-relaxed font-medium">{feat.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BrowseView({ skills, searchQuery, setSearchQuery, setView }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr]"
    >
      <div className="p-16 md:p-24 border-r border-ink">
        <div className="label-caps mb-12">Featured Opportunities</div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {skills
            .filter((s: any) => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((skill: any) => (
            <div 
              key={skill.id} 
              className="editorial-card group flex flex-col justify-between h-[300px]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="label-caps opacity-40 mb-1 group-hover:opacity-100 transition-opacity">TEACHING</div>
                  <h3 className="font-serif text-3xl font-bold leading-tight">{skill.title}</h3>
                </div>
                <div className="font-serif italic opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">1.0 hr</div>
              </div>
              
              <div className="flex justify-between items-end mt-8">
                <p className="text-[13px] font-medium opacity-60 group-hover:opacity-100 transition-opacity line-clamp-3 max-w-[200px]">
                  {skill.description}
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    alert("Skill booking is coming in the next update!");
                  }}
                  className="font-extrabold text-[11px] uppercase tracking-[0.2em] border-b-2 border-current pb-1 hover:pb-2 transition-all"
                >
                  BOOK
                </button>
              </div>
            </div>
          ))}
          
          {skills.length === 0 && (
            <div className="col-span-full py-24 text-center border border-dashed border-ink/20 italic opacity-40">
               Nothing here yet. Be the first to share.
            </div>
          )}
        </div>
      </div>

      <div className="sidebar p-16 md:p-24 bg-ink/5">
        <div className="sticky top-32">
          <div className="label-caps mb-8">Search Registry</div>
          <div className="relative mb-16">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20" size={20} />
            <input 
              type="text" 
              placeholder="Filter by skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-4 bg-transparent border-b border-ink/40 outline-none focus:border-ink transition-colors font-serif italic text-2xl"
            />
          </div>

          <div className="label-caps mb-8">Quick Actions</div>
          <div className="space-y-4">
            <button 
              onClick={() => setView('create-skill')}
              className="w-full p-8 border border-ink text-left hover:bg-ink hover:text-paper transition-all group"
            >
              <div className="label-caps group-hover:text-paper/40">New Offering</div>
              <div className="font-serif text-2xl">Publish your expertise</div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardView({ profile, setView }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr]"
    >
      <div className="p-16 md:p-24 border-r border-ink">
        <div className="label-caps mb-12">Performance Summary</div>
        <div className="grid grid-cols-1 md:grid-cols-2 border border-ink mb-16">
          <div className="p-12 border-b md:border-b-0 md:border-r border-ink">
            <div className="label-caps">Time Credits</div>
            <div className="font-serif text-8xl font-bold flex items-baseline gap-4 mt-4">
              {profile.credits}
              <span className="text-2xl opacity-40 font-normal italic">hrs</span>
            </div>
          </div>
          <div className="p-12">
            <div className="label-caps">Active Learners</div>
            <div className="font-serif text-8xl font-bold mt-4">0</div>
          </div>
        </div>

        <div className="label-caps mb-8">Live Itinerary</div>
        <div className="bg-ink text-paper p-16 relative overflow-hidden">
          <h4 className="font-serif text-3xl italic mb-4">No sessions scheduled</h4>
          <p className="opacity-60 text-sm max-w-sm mb-12">Your editorial schedule for the week is currently blank. Discover expertise in the registry.</p>
          <button 
            onClick={() => setView('browse')}
            className="font-extrabold text-[11px] uppercase tracking-[0.2em] border-b border-paper pb-1 hover:pb-2 transition-all"
          >
            EXPLORE REGISTRY
          </button>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-paper/5 rounded-full" />
        </div>
      </div>

      <div className="p-16 md:p-24 bg-ink/5">
        <div className="label-caps mb-12">Registry Offers</div>
        <div className="space-y-12">
          {profile.skillsToTeach?.length > 0 ? (
             profile.skillsToTeach.map((s: string, i: number) => (
              <div key={i} className="request-item flex justify-between items-center border-b border-ink/10 pb-4">
                <span className="font-serif text-xl italic">{s}</span>
                <div className="w-2 h-2 bg-ink rounded-full" />
              </div>
             ))
          ) : (
            <p className="text-sm italic opacity-40">You haven't listed any expertise yet.</p>
          )}
          
          <button 
            onClick={() => setView('create-skill')}
            className="w-full mt-12 p-8 border border-ink text-center hover:bg-ink hover:text-paper transition-all font-extrabold text-[11px] uppercase tracking-[0.2em]"
          >
            PUBLISH NEW OFFERING
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileView({ profile }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-[1400px] mx-auto border-x border-ink min-h-screen bg-paper"
    >
      <div className="h-64 bg-ink flex items-center px-16 md:px-32 relative overflow-hidden">
        <h2 className="text-paper font-serif text-6xl md:text-[8rem] font-bold italic tracking-tighter relative z-10">Correspondent.</h2>
        <div className="absolute right-0 bottom-0 opacity-10 font-serif text-[20rem] translate-y-1/2 leading-none">{profile.displayName[0]}</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
        <div className="p-16 md:p-32 border-r border-ink">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20 pb-20 border-b border-ink/10">
            <div>
              <div className="label-caps">Public Identity</div>
              <h1 className="text-6xl font-serif font-bold italic mb-4">{profile.displayName}</h1>
              <div className="label-caps opacity-100 flex items-center gap-2">
                <Clock size={16} className="text-ink" />
                <span>{profile.credits} CREDITS ACCUMULATED</span>
              </div>
            </div>
            {profile.photoURL && (
              <img 
                src={profile.photoURL} 
                className="w-48 h-48 border border-ink grayscale hover:grayscale-0 transition-all duration-500" 
                alt="" 
              />
            )}
          </div>

          <div className="space-y-16">
            <div>
              <div className="label-caps">Personal Manifesto</div>
              <p className="text-3xl font-serif italic text-ink/80 leading-relaxed">
                {profile.bio || "No biography recorded in the registry yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="p-16 md:p-24 bg-ink/5">
          <div className="space-y-16 sticky top-32">
            <div>
              <div className="label-caps">Expertise Registry</div>
              <div className="flex flex-wrap gap-3 mt-6">
                {profile.skillsToTeach?.length > 0 ? profile.skillsToTeach.map((s: any, i: any) => (
                  <span key={i} className="border border-ink px-4 py-2 text-xs font-extrabold uppercase tracking-widest">{s}</span>
                )) : <span className="italic opacity-40">None documented.</span>}
              </div>
            </div>
            <div>
              <div className="label-caps">Seeking Knowledge</div>
              <div className="flex flex-wrap gap-3 mt-6">
                {profile.skillsToLearn?.length > 0 ? profile.skillsToLearn.map((s: any, i: any) => (
                  <span key={i} className="bg-ink text-paper px-4 py-2 text-xs font-extrabold uppercase tracking-widest">{s}</span>
                )) : <span className="italic opacity-40">None documented.</span>}
              </div>
            </div>
            
            <button className="w-full py-8 border border-ink font-extrabold text-[11px] uppercase tracking-[0.2em] hover:bg-ink hover:text-paper transition-all">
              EDIT ARCHIVE
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CreateSkillView({ user, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    category: 'General'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await skillSwapService.createSkill({
        ...formData,
        ownerId: user.uid,
        ownerName: user.displayName || 'Swapper',
        ownerPhoto: user.photoURL || '',
        level: formData.level as any
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to list skill. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-16 md:p-32 max-w-5xl mx-auto"
    >
      <div className="mb-16">
        <div className="label-caps">Registry Entry</div>
        <h2 className="text-6xl md:text-8xl font-serif font-bold italic tracking-tighter leading-none mb-6">Publish expertise.</h2>
        <p className="text-xl opacity-60 italic font-medium">Earn credits by helping the community flourish.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-12 border-t border-ink pt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <label className="label-caps block">Skill Title</label>
              <input 
                required
                type="text" 
                placeholder="Italian Cuisine, Portrait Lighting..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-serif text-3xl focus:border-ink transition-colors"
              />
            </div>
            <div>
              <label className="label-caps block">Category</label>
              <input 
                type="text" 
                placeholder="Cooking, Photography..."
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-serif italic text-2xl focus:border-ink transition-colors"
              />
            </div>
          </div>
          <div className="space-y-8">
             <div>
              <label className="label-caps block">Description</label>
              <textarea 
                required
                rows={4}
                placeholder="What will you teach in a 1-hour session?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-medium text-lg focus:border-ink transition-colors resize-none"
              />
            </div>
            <div>
              <label className="label-caps block">Proficiency Level</label>
              <select 
                value={formData.level}
                onChange={e => setFormData({...formData, level: e.target.value as any})}
                className="w-full py-4 bg-transparent border-b border-ink outline-none font-bold text-sm appearance-none cursor-pointer"
              >
                <option value="beginner">BEGINNER</option>
                <option value="intermediate">INTERMEDIATE</option>
                <option value="advanced">ADVANCED</option>
              </select>
            </div>
          </div>
        </div>
        
        <button 
          disabled={isSubmitting}
          type="submit"
          className="w-full py-8 bg-ink text-paper font-extrabold text-[11px] uppercase tracking-[0.2em] border border-ink hover:bg-paper hover:text-ink transition-all"
        >
          {isSubmitting ? 'SYNCING REGISTRY...' : 'PUBLISH TO MARKETPLACE'}
        </button>
      </form>
    </motion.div>
  );
}

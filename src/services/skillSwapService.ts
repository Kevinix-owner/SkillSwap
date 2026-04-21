import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  credits: number;
  bio?: string;
  skillsToTeach: string[];
  skillsToLearn: string[];
  createdAt: any;
}

export interface SkillOffer {
  id?: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  createdAt: any;
}

export interface Session {
  id?: string;
  mentorId: string;
  mentorName: string;
  learnerId: string;
  learnerName: string;
  skillId: string;
  skillTitle: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  scheduledAt: any;
  durationMinutes: number;
  creditsExchanged: number;
  mentorNote?: string;
  learnerFeedback?: string;
  rating?: number;
  createdAt: any;
}

export const skillSwapService = {
  // User Profile
  async getOrCreateUserProfile(user: any): Promise<UserProfile> {
    const userDoc = doc(db, 'users', user.uid);
    const snap = await getDoc(userDoc);
    
    if (snap.exists()) {
      return snap.data() as UserProfile;
    } else {
      const newUser: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL,
        credits: 2, // Starter credits
        bio: '',
        skillsToTeach: [],
        skillsToLearn: [],
        createdAt: serverTimestamp()
      };
      await setDoc(userDoc, newUser);
      return newUser;
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const userDoc = doc(db, 'users', uid);
    await updateDoc(userDoc, data);
  },

  // Skills
  async createSkill(skill: Omit<SkillOffer, 'id' | 'createdAt'>) {
    return await addDoc(collection(db, 'skills'), {
      ...skill,
      createdAt: serverTimestamp()
    });
  },

  async getSkills() {
    const q = query(collection(db, 'skills'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SkillOffer));
  },

  // Sessions
  async createSession(session: Omit<Session, 'id' | 'createdAt' | 'status'>) {
    // Check if learner has credits (frontend should also check, but rules will enforce)
    return await addDoc(collection(db, 'sessions'), {
      ...session,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  },

  async completeSession(sessionId: string, mentorId: string, learnerId: string, credits: number) {
    const batch = writeBatch(db);
    
    const sessionDoc = doc(db, 'sessions', sessionId);
    batch.update(sessionDoc, { status: 'completed' });
    
    const mentorDoc = doc(db, 'users', mentorId);
    const learnerDoc = doc(db, 'users', learnerId);
    
    // In a real app, we'd use increment() for atomicity safely
    // Actually, Firestore has increment()
    const { increment } = await import('firebase/firestore');
    batch.update(mentorDoc, { credits: increment(credits) });
    batch.update(learnerDoc, { credits: increment(-credits) });
    
    await batch.commit();
  },

  async updateSessionStatus(sessionId: string, status: Session['status']) {
    const sessionDoc = doc(db, 'sessions', sessionId);
    await updateDoc(sessionDoc, { status });
  }
};

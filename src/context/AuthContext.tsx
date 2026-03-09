import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut, 
  deleteUser, 
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, deleteDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

interface AppUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  status?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  cleanupGuests: () => Promise<void>;
  deleteAllUsers: () => Promise<void>;
  deleteAllMessages: () => Promise<void>;
  deleteAllChannels: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ensure admin account exists
  useEffect(() => {
    const seedAdmin = async () => {
      // Only run if not already seeded and NO ONE is logged in
      if (localStorage.getItem("admin_seeded_v1") || auth.currentUser) return;
      
      const adminEmail = "danillitucinka@gmail.com";
      const adminPass = "0667824233";
      const adminNick = "slava admin";

      try {
        // Try to create the user. 
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        const firebaseUser = userCredential.user;
        
        // Create the user document in Firestore
        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: firebaseUser.uid,
          username: adminNick,
          email: adminEmail,
          role: "admin",
          createdAt: serverTimestamp(),
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminNick)}&background=random`,
        });
        console.log("Admin account seeded successfully");
        localStorage.setItem("admin_seeded_v1", "true");
        
        // After seeding, sign out so the user can log in normally or it will be picked up by onAuthStateChanged
        await signOut(auth);
      } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          localStorage.setItem("admin_seeded_v1", "true");
        } else {
          console.error("Error seeding admin account:", error);
        }
      }
    };

    // Delay slightly to allow onAuthStateChanged to initialize
    const timer = setTimeout(() => {
      seedAdmin();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const isAdminEmail = firebaseUser.email === "danillitucinka@gmail.com";
          setUser({
            id: firebaseUser.uid,
            username: data.username,
            email: firebaseUser.email || data.email || "guest@example.com",
            role: isAdminEmail ? "admin" : (data.role || "user"),
            avatar: data.avatar,
            status: data.status
          });
        } else {
          // Fallback for users without a document yet (e.g. just signed in anonymously)
          setUser({
            id: firebaseUser.uid,
            username: firebaseUser.displayName || `Guest_${firebaseUser.uid.slice(0, 5)}`,
            email: firebaseUser.email || "guest@example.com",
            role: "user"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (user && auth.currentUser?.isAnonymous) {
      try {
        // Delete Firestore document first
        await deleteDoc(doc(db, "users", user.id));
        // Then delete the anonymous user account
        await deleteUser(auth.currentUser);
      } catch (error) {
        console.error("Failed to cleanup guest account", error);
      }
    } else {
      await signOut(auth);
    }
    setUser(null);
  };

  const cleanupGuests = async () => {
    if (user?.role !== 'admin') return;
    try {
      // Query for users with guest email
      const q = query(collection(db, "users"), where("email", "==", "guest@example.com"));
      const snapshot = await getDocs(q);
      
      // Also check for users with "Guest_" in their username if email is missing or different
      const allUsers = await getDocs(collection(db, "users"));
      const guestDocs = allUsers.docs.filter(d => {
        const data = d.data();
        return data.email === "guest@example.com" || (data.username && data.username.startsWith("Guest_"));
      });

      const deletePromises = guestDocs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${guestDocs.length} guest accounts.`);
    } catch (error) {
      console.error("Failed to cleanup guests", error);
    }
  };

  const deleteAllUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const snapshot = await getDocs(collection(db, "users"));
      // Don't delete the admin themselves
      const deletePromises = snapshot.docs
        .filter(d => d.data().email !== "danillitucinka@gmail.com")
        .map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${deletePromises.length} user profiles.`);
    } catch (error) {
      console.error("Failed to delete all users", error);
    }
  };

  const deleteAllMessages = async () => {
    if (user?.role !== 'admin') return;
    try {
      const snapshot = await getDocs(collection(db, "messages"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${snapshot.docs.length} messages.`);
    } catch (error) {
      console.error("Failed to delete all messages", error);
    }
  };

  const deleteAllChannels = async () => {
    if (user?.role !== 'admin') return;
    try {
      const snapshot = await getDocs(collection(db, "channels"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${snapshot.docs.length} channels.`);
    } catch (error) {
      console.error("Failed to delete all channels", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, cleanupGuests, deleteAllUsers, deleteAllMessages, deleteAllChannels }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

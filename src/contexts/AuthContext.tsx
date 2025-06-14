import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/lib/types';
import { ensureUserInProfiles } from '@/utils/supabaseUtils';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signUp: (email: string, password: string, name: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      // Wait a bit before fetching to allow for profile creation
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If it's a permission error, try to create the profile
        if (error.code === '42501' && retryCount < 2) {
          console.log('Permission error, trying to ensure profile exists...');
          await ensureUserInProfiles();
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        return null;
      }

      if (!data) {
        console.log('No profile found, ensuring user exists in profiles...');
        
        if (retryCount < 3) {
          // Try to create the profile
          const created = await ensureUserInProfiles();
          
          if (created) {
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchUserProfile(userId, retryCount + 1);
          }
        }
        
        console.log('Profile still not found after creation attempts');
        return null;
      }

      console.log('User profile fetched successfully:', data);
      return data as UserProfile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        
        if (!mounted) return;

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('User signed in, fetching profile...');
            
            try {
              // Ensure profile exists first
              await ensureUserInProfiles();
              
              // Then fetch the profile
              const profileData = await fetchUserProfile(session.user.id);
              
              if (mounted) {
                setProfile(profileData);
                
                // Navigate based on role after profile is loaded
                if (profileData) {
                  console.log('Profile loaded, navigating based on role:', profileData.role);
                  
                  // Small delay to ensure state is stable
                  setTimeout(() => {
                    if (profileData.role === 'admin') {
                      navigate('/admin', { replace: true });
                    } else {
                      navigate('/dashboard-supir', { replace: true });
                    }
                  }, 100);
                } else {
                  console.log('No profile found, staying on current page');
                }
              }
            } catch (error) {
              console.error('Error handling sign in:', error);
            }
          }
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      console.log("Initial session check:", session?.user?.email);
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        
        try {
          await ensureUserInProfiles();
          const profileData = await fetchUserProfile(session.user.id);
          
          if (mounted) {
            setProfile(profileData);
          }
        } catch (error) {
          console.error('Error in initial session check:', error);
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in with:", email);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Sign in response:", data?.user?.email, error?.message);
      
      // Don't set loading to false here - let the auth state change handler do it
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
      return { error, data: null };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log("Attempting sign up for:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name
          },
        },
      });

      console.log("Sign up response:", data?.user?.email, error?.message);
      
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error, data: null };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      setIsLoading(true);
      
      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      
      console.log('Logout successful, redirecting to auth page');
      navigate('/auth', { replace: true });
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear and redirect even on error
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      navigate('/auth', { replace: true });
    }
  };

  // Check if the profile has admin role
  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
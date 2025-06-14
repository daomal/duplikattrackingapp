
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Validates the Supabase connection and types
 * @returns A promise that resolves to true if the connection is valid
 */
export const validateSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Try fetching from the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }

    console.log('Supabase connection validated successfully');
    return true;
  } catch (error) {
    console.error('Error validating Supabase connection:', error);
    return false;
  }
};

/**
 * Add the current user to the profiles table if they don't exist
 * @returns A promise that resolves to true if the user was added or already exists
 */
export const ensureUserInProfiles = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user is logged in');
      return false;
    }

    // Check if the user exists in the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking user profile:', error);
      return false;
    }

    // If the user doesn't exist, create them
    if (!data) {
      console.log('Creating new user profile');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          role: 'user'
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return false;
      }
      
      return true;
    }

    console.log('User profile already exists');
    return true;
  } catch (error) {
    console.error('Error ensuring user in profiles:', error);
    return false;
  }
};

/**
 * Registers a new user with email and password
 */
export const registerUser = async (email: string, password: string, name: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log(`Registering user: ${email}`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Gagal mendaftar'
      };
    }

    // Auto-create the profile
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name: name,
        role: 'user'
      });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    console.log('Registration successful:', data);
    
    return {
      success: true,
      message: 'Pendaftaran berhasil',
      data
    };
  } catch (error: any) {
    console.error('Registration exception:', error);
    return {
      success: false,
      message: error.message || 'Gagal mendaftar'
    };
  }
};

/**
 * Login dengan email dan password
 */
export const loginUser = async (email: string, password: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log(`Attempting login for: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error);
      
      // Memberikan pesan yang lebih spesifik
      let errorMessage = 'Gagal login';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email atau password tidak valid. Silakan periksa kembali.';
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
    
    console.log('Login successful:', data.user?.email);
    
    return {
      success: true,
      message: 'Login berhasil',
      data
    };
  } catch (error: any) {
    console.error('Login exception:', error);
    return {
      success: false,
      message: error.message || 'Gagal login'
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        message: error.message || 'Gagal logout'
      };
    }
    
    return {
      success: true,
      message: 'Logout berhasil'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal logout'
    };
  }
};

/**
 * Mendapatkan status admin dari user
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error || !data) return false;
    
    return data.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Reset password user
 */
export const resetPassword = async (email: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      return {
        success: false,
        message: error.message || 'Gagal mengirim email reset password'
      };
    }
    
    return {
      success: true,
      message: 'Email reset password telah dikirim'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal mengirim email reset password'
    };
  }
};

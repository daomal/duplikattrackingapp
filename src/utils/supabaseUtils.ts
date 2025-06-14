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

    console.log('Ensuring user exists in profiles:', user.id, user.email);

    // First check if profile already exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking user profile:', selectError);
    }

    if (existingProfile) {
      console.log('User profile already exists:', existingProfile);
      return true;
    }

    console.log('Creating new user profile for:', user.email);
    
    const userName = user.user_metadata?.name || 
                    user.user_metadata?.full_name || 
                    user.email?.split('@')[0] || 
                    'User';

    // Use the RPC function to create profile
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
      user_id: user.id,
      user_name: userName,
      user_role: 'user'
    });
    
    if (rpcError) {
      console.error('RPC error creating profile:', rpcError);
      
      // Fallback to direct insert if RPC fails
      console.log('Trying direct insert as fallback...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: userName,
          role: 'user'
        });

      if (insertError) {
        console.error('Direct insert also failed:', insertError);
        
        // Check one more time if profile was created by trigger
        const { data: finalCheck } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (finalCheck) {
          console.log('Profile found after errors - created by trigger');
          return true;
        }
        
        return false;
      }
    }
    
    console.log('User profile created successfully via RPC:', rpcResult);
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
    console.log(`Registering user: ${email} with name: ${name}`);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          full_name: name
        }
      }
    });
    
    if (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Gagal mendaftar'
      };
    }

    if (data.user) {
      console.log('User registered successfully:', data.user.email);
      
      // Wait for trigger to work, then ensure profile exists
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const profileCreated = await ensureUserInProfiles();
      
      if (!profileCreated) {
        console.warn('Profile creation failed, but user was registered');
      }
    }
    
    return {
      success: true,
      message: 'Pendaftaran berhasil! Silakan login dengan akun baru Anda.',
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
      
      let errorMessage = 'Gagal login';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email atau password tidak valid. Pastikan Anda sudah mendaftar dan menggunakan kredensial yang benar.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email belum dikonfirmasi. Silakan periksa email Anda.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit.';
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
    
    if (data.user) {
      console.log('Login successful for:', data.user.email);
      
      // Ensure user profile exists after login
      await ensureUserInProfiles();
    }
    
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
      .maybeSingle();
    
    if (error || !data) {
      console.log('No profile found or error:', error);
      return false;
    }
    
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

/**
 * Manually create admin user (for development/testing)
 */
export const createAdminUser = async (email: string, password: string, name: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('Creating admin user:', email);
    
    // First register the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          full_name: name
        }
      }
    });
    
    if (error) {
      console.error('Admin registration error:', error);
      return {
        success: false,
        message: error.message || 'Gagal membuat admin'
      };
    }
    
    if (!data.user) {
      return {
        success: false,
        message: 'User tidak berhasil dibuat'
      };
    }
    
    console.log('Admin user registered, creating profile...');
    
    // Wait for trigger to work
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create or update profile with admin role using RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
      user_id: data.user.id,
      user_name: name,
      user_role: 'admin'
    });
    
    if (rpcError) {
      console.error('RPC error creating admin profile:', rpcError);
      
      // Fallback to direct update
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);
        
      if (updateError) {
        console.error('Error updating profile to admin:', updateError);
        return {
          success: false,
          message: 'User dibuat tapi gagal set role admin'
        };
      }
    }
    
    console.log('Admin user created successfully:', rpcResult);
    
    return {
      success: true,
      message: 'Admin berhasil dibuat!'
    };
  } catch (error: any) {
    console.error('Create admin exception:', error);
    return {
      success: false,
      message: error.message || 'Gagal membuat admin'
    };
  }
};

/**
 * Create user profile manually (fallback function)
 */
export const createUserProfile = async (userId: string, name: string, role: 'user' | 'admin' = 'user'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name,
        role: role
      });
      
    if (error) {
      console.error('Error creating user profile manually:', error);
      return false;
    }
    
    console.log('User profile created manually');
    return true;
  } catch (error) {
    console.error('Exception creating user profile:', error);
    return false;
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception fetching user profile:', error);
    return null;
  }
};
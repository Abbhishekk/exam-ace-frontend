import { supabase } from './supabase'

export const dbService = {
  async getUserProfile(userId: string) {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
  },

  async getUserRole(userId: string) {
    return await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()
  },

  async getExamByCode(code: string) {
    return await supabase
      .from('exams')
      .select('*')
      .eq('code', code)
      .single()
  }
}
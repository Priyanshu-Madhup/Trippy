import { isDemoMode } from '@/lib/env'
import { demoBackend } from './demoBackend'
import { supabaseBackend } from './supabaseBackend'
import type { Backend } from './types'

export const backend: Backend = isDemoMode ? demoBackend : supabaseBackend

export type { AuthSession, AuthUser, Backend, PlaceInput, UsageStats } from './types'

import { supabase } from './supabase'

export type SessionDoorNight = {
  id: string
  session_id: string
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export type SessionDoorGrant = {
  id: string
  session_id: string
  helper_name: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  night_id?: string | null
}

export type SessionDoorHelperName = {
  id: string
  session_id: string
  helper_name: string
  created_at: string
}

export async function fetchDoorNight(
  sessionId: string,
): Promise<SessionDoorNight | null> {
  const { data, error } = await supabase
    .from('session_door_nights')
    .select('id, session_id, expires_at, revoked_at, created_at')
    .eq('session_id', sessionId)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  if (new Date(data.expires_at) <= new Date()) return null
  return data
}

export async function fetchDoorGrants(sessionId: string): Promise<SessionDoorGrant[]> {
  const { data, error } = await supabase
    .from('session_door_grants')
    .select('id, session_id, helper_name, expires_at, revoked_at, created_at, night_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function fetchDoorHelperNames(
  sessionId: string,
): Promise<SessionDoorHelperName[]> {
  const { data, error } = await supabase
    .from('session_door_helper_names')
    .select('id, session_id, helper_name, created_at')
    .eq('session_id', sessionId)
    .order('helper_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function addDoorHelperName(input: {
  sessionId: string
  helperName: string
}): Promise<SessionDoorHelperName> {
  const { data, error } = await supabase
    .from('session_door_helper_names')
    .insert({
      session_id: input.sessionId,
      helper_name: input.helperName.trim(),
    })
    .select('id, session_id, helper_name, created_at')
    .single()

  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      throw new Error('That name is already on the list.')
    }
    throw new Error(error.message)
  }

  return data
}

export async function removeDoorHelperName(id: string): Promise<void> {
  const { error } = await supabase
    .from('session_door_helper_names')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function startDoorNight(input: {
  sessionId: string
  regenerate?: boolean
}): Promise<{ pin: string; night: SessionDoorNight }> {
  const { data, error } = await supabase.functions.invoke('create-door-grant', {
    body: {
      session_id: input.sessionId,
      regenerate: Boolean(input.regenerate),
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.pin || !data?.night) {
    throw new Error('Could not start door night.')
  }

  return data as { pin: string; night: SessionDoorNight }
}

export async function endDoorNight(sessionId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('revoke-door-grant', {
    body: { session_id: sessionId },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }
}

export async function redeemDoorGrant(input: {
  pin: string
  helperName: string
}): Promise<{
  access_token: string
  refresh_token: string
  helper_name: string
}> {
  const { data, error } = await supabase.functions.invoke('redeem-door-grant', {
    body: { pin: input.pin, helper_name: input.helperName },
  })

  if (error) {
    const context =
      typeof error === 'object' &&
      error !== null &&
      'context' in error &&
      error.context instanceof Response
        ? error.context
        : null
    let detail = error.message || 'Could not start door session.'
    if (context) {
      try {
        const payload = (await context.json()) as {
          error?: string
          detail?: string
        }
        if (typeof payload.error === 'string' && payload.error) {
          detail = payload.detail
            ? `${payload.error} (${payload.detail})`
            : payload.error
        }
      } catch {
        // keep message
      }
    }
    throw new Error(detail)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const payload = data as { error?: string; detail?: string }
    throw new Error(
      payload.detail
        ? `${payload.error ?? 'Door login failed'} (${payload.detail})`
        : payload.error ?? 'Door login failed',
    )
  }

  if (!data?.access_token || !data?.refresh_token) {
    throw new Error(data?.error ?? 'That PIN is not valid or has expired.')
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    helper_name: (data.helper_name as string) || input.helperName,
  }
}

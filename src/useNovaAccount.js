import { useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase.js';

const unique = (values) => [...new Set(values.filter(Boolean))];
const dedupeItems = (items) => {
  const map = new Map();
  for (const item of items.filter(Boolean)) {
    if (item?.id) map.set(item.id, item);
  }
  return [...map.values()];
};

export default function useNovaAccount({
  feed,
  selectedTopics,
  saved,
  savedItems,
  setSelectedTopics,
  setSaved,
  setSavedItems,
}) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [cloudState, setCloudState] = useState(supabaseConfigured ? 'connecting' : 'guest');
  const [cloudError, setCloudError] = useState('');
  const hydratedUserRef = useRef(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setCloudError(error.message);
      setSession(data?.session || null);
      setAuthReady(true);
      setCloudState(data?.session ? 'syncing' : 'guest');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydratedUserRef.current = null;
      setSession(nextSession || null);
      setAuthReady(true);
      setCloudState(nextSession ? 'syncing' : 'guest');
      setCloudError('');
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !session?.user?.id || hydratedUserRef.current === session.user.id) return;
    hydratedUserRef.current = session.user.id;

    const hydrate = async () => {
      setCloudState('syncing');
      setCloudError('');
      const userId = session.user.id;
      const displayName = session.user.user_metadata?.display_name || '';

      try {
        await supabase.from('profiles').upsert({
          user_id: userId,
          display_name: displayName || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        const [{ data: remotePrefs, error: prefsError }, { data: remoteSaved, error: savedError }] = await Promise.all([
          supabase.from('user_preferences').select('topics').eq('user_id', userId).maybeSingle(),
          supabase.from('saved_items').select('item_id,item,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        ]);
        if (prefsError) throw prefsError;
        if (savedError) throw savedError;

        if (remotePrefs?.topics?.length) {
          setSelectedTopics(remotePrefs.topics);
        } else {
          await supabase.from('user_preferences').upsert({
            user_id: userId,
            topics: selectedTopics,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }

        const remoteItems = (remoteSaved || []).map((row) => row.item).filter(Boolean);
        const localSnapshots = dedupeItems([
          ...savedItems,
          ...feed.filter((item) => saved.includes(item.id)),
        ]);

        const remoteIds = new Set((remoteSaved || []).map((row) => row.item_id));
        const localRowsToMigrate = localSnapshots
          .filter((item) => saved.includes(item.id) && !remoteIds.has(item.id))
          .map((item) => ({ user_id: userId, item_id: item.id, item }));

        if (localRowsToMigrate.length) {
          const { error: migrateError } = await supabase.from('saved_items').upsert(localRowsToMigrate, { onConflict: 'user_id,item_id' });
          if (migrateError) throw migrateError;
        }

        const mergedItems = dedupeItems([...remoteItems, ...localSnapshots.filter((item) => saved.includes(item.id))]);
        setSavedItems(mergedItems);
        setSaved(unique([...(remoteSaved || []).map((row) => row.item_id), ...saved]));
        setCloudState('synced');
      } catch (error) {
        setCloudState('error');
        setCloudError(error?.message || 'Cloud sync failed.');
      }
    };

    hydrate();
  }, [session?.user?.id]);

  const signUp = async ({ email, password, displayName }) => {
    if (!supabaseConfigured || !supabase) throw new Error('Cloud accounts are not configured yet.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() || undefined },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    if (!supabaseConfigured || !supabase) throw new Error('Cloud accounts are not configured yet.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    hydratedUserRef.current = null;
    setSession(null);
    setCloudState('guest');
  };

  const syncTopics = async (topics) => {
    if (!session?.user?.id || !supabase) return;
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: session.user.id,
      topics,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      setCloudState('error');
      setCloudError(error.message);
    } else {
      setCloudState('synced');
    }
  };

  const syncSavedItem = async (item, shouldSave) => {
    if (!session?.user?.id || !supabase || !item?.id) return;
    let error = null;
    if (shouldSave) {
      ({ error } = await supabase.from('saved_items').upsert({
        user_id: session.user.id,
        item_id: item.id,
        item,
      }, { onConflict: 'user_id,item_id' }));
    } else {
      ({ error } = await supabase.from('saved_items').delete().eq('user_id', session.user.id).eq('item_id', item.id));
    }
    if (error) {
      setCloudState('error');
      setCloudError(error.message);
    } else {
      setCloudState('synced');
    }
  };

  const trackActivity = async (item, action, metadata = {}) => {
    if (!session?.user?.id || !supabase || !item?.id) return;
    await supabase.from('user_activity').insert({
      user_id: session.user.id,
      item_id: item.id,
      action,
      topic: item.topic || null,
      metadata,
    });
  };

  const trackAiUsage = async (item, mode, payload = {}) => {
    if (!session?.user?.id || !supabase || !item?.id) return;
    const usage = payload.usage || {};
    await supabase.from('ai_usage').insert({
      user_id: session.user.id,
      item_id: item.id,
      mode,
      model: payload.model || null,
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null,
      total_tokens: usage.totalTokens ?? null,
      cached: Boolean(payload.cached),
    });
  };

  return {
    configured: supabaseConfigured,
    session,
    user: session?.user || null,
    authReady,
    cloudState,
    cloudError,
    signUp,
    signIn,
    signOut,
    syncTopics,
    syncSavedItem,
    trackActivity,
    trackAiUsage,
  };
}

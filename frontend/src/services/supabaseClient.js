import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = import.meta.env.DEV;

const debugFetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    const method = init?.method || 'GET';
    const start = performance.now();

    // Avoid leaking sensitive headers; log only the URL/method.
    console.info('[Supabase][fetch] start', method, url);

    // Add a safety timeout so requests can't hang forever in dev.
    // If the request is aborted, Supabase will throw and the caller can surface the error.
    const timeoutMs = 15000;
    const controller = new AbortController();
    const signal = init.signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, controller.signal])
        : (init.signal || controller.signal);

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(input, { ...init, signal });
        console.info(
            '[Supabase][fetch] done',
            method,
            url,
            'status',
            res.status,
            'ms',
            Math.round(performance.now() - start)
        );
        return res;
    } catch (err) {
        console.error(
            '[Supabase][fetch] error',
            method,
            url,
            'ms',
            Math.round(performance.now() - start),
            err
        );
        throw err;
    } finally {
        clearTimeout(timer);
    }
};

if (isDev) {
    console.info('[Supabase] client init', {
        url: supabaseUrl,
        hasAnonKey: Boolean(supabaseAnonKey),
    });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: isDev ? debugFetch : fetch,
    },
});

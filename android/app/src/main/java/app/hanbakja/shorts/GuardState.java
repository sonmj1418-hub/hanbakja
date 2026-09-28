package app.hanbakja.shorts;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * On-device flags for the guard. No screen text, account data, or view ids.
 */
public final class GuardState {
    private static final String PREFS = "hanbakja_guard";
    private static final String KEY_MODE = "mode";
    private static final String KEY_TARGET = "target";
    private static final String KEY_SUPPRESS = "suppress_until";
    private static final String KEY_SECONDS = "watch_seconds";
    private static final String KEY_ENDED = "watch_ended";

    private static final String IDLE = "idle";
    private static final String PROMPTING = "prompting";
    private static final String WATCHING = "watching";

    private static final Object LOCK = new Object();

    private GuardState() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void startPrompt(Context context, String target) {
        synchronized (LOCK) {
            prefs(context).edit()
                .putString(KEY_MODE, PROMPTING)
                .putString(KEY_TARGET, target)
                .commit();
        }
    }

    public static boolean isPrompting(Context context, String target) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            return PROMPTING.equals(prefs.getString(KEY_MODE, IDLE))
                && target.equals(prefs.getString(KEY_TARGET, ""));
        }
    }

    public static String pendingTarget(Context context) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            if (!PROMPTING.equals(prefs.getString(KEY_MODE, IDLE))) return "";
            String target = prefs.getString(KEY_TARGET, "");
            return target == null ? "" : target;
        }
    }

    public static void beginWatch(Context context, String target) {
        synchronized (LOCK) {
            prefs(context).edit()
                .putString(KEY_MODE, WATCHING)
                .putString(KEY_TARGET, target)
                .putBoolean(KEY_ENDED, false)
                .commit();
        }
    }

    public static boolean isWatching(Context context) {
        synchronized (LOCK) {
            return WATCHING.equals(prefs(context).getString(KEY_MODE, IDLE));
        }
    }

    public static String watchTarget(Context context) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            if (!WATCHING.equals(prefs.getString(KEY_MODE, IDLE))) return "";
            String target = prefs.getString(KEY_TARGET, "");
            return target == null ? "" : target;
        }
    }

    public static void addWatchSecond(Context context) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            if (!WATCHING.equals(prefs.getString(KEY_MODE, IDLE))) return;
            int seconds = prefs.getInt(KEY_SECONDS, 0);
            prefs.edit().putInt(KEY_SECONDS, seconds + 1).commit();
        }
    }

    public static void endWatch(Context context) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            if (!WATCHING.equals(prefs.getString(KEY_MODE, IDLE))) return;
            prefs.edit()
                .putString(KEY_MODE, IDLE)
                .putString(KEY_TARGET, "")
                .putBoolean(KEY_ENDED, true)
                .commit();
        }
    }

    public static void idleAndSuppress(Context context, long suppressMs) {
        synchronized (LOCK) {
            prefs(context).edit()
                .putString(KEY_MODE, IDLE)
                .putString(KEY_TARGET, "")
                .putLong(KEY_SUPPRESS, System.currentTimeMillis() + suppressMs)
                .commit();
        }
    }

    public static boolean isSuppressed(Context context) {
        synchronized (LOCK) {
            return System.currentTimeMillis() < prefs(context).getLong(KEY_SUPPRESS, 0L);
        }
    }

    public static final class WatchTake {
        public final int seconds;
        public final boolean ended;

        WatchTake(int seconds, boolean ended) {
            this.seconds = seconds;
            this.ended = ended;
        }
    }

    public static WatchTake takeWatch(Context context) {
        synchronized (LOCK) {
            SharedPreferences prefs = prefs(context);
            int seconds = prefs.getInt(KEY_SECONDS, 0);
            boolean ended = prefs.getBoolean(KEY_ENDED, false);
            prefs.edit().putInt(KEY_SECONDS, 0).putBoolean(KEY_ENDED, false).commit();
            return new WatchTake(seconds, ended);
        }
    }
}

package app.hanbakja.shorts;

import android.accessibilityservice.AccessibilityService;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

/**
 * Notices the YouTube Shorts player and the Instagram Reels player, then opens
 * Focus on. Resource ids and activity class names only. Screen text is not
 * stored or uploaded.
 */
public class ShortsGuardService extends AccessibilityService {
    private static WeakReference<ShortsGuardService> instance = new WeakReference<>(null);

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int missedWatchChecks;
    private int missedAway;
    private long lastScanUptime;
    private long lastLaunchElapsed;
    private boolean destroyed;
    private boolean closing;

    private final Runnable watchTick = new Runnable() {
        @Override
        public void run() {
            if (destroyed) return;
            try {
                tickWatch();
            } finally {
                if (!destroyed) mainHandler.postDelayed(this, 1000);
            }
        }
    };

    static void requestLeave(Context context, String target) {
        GuardState.idleAndSuppress(context, 2500);
        if ("youtube".equals(target)) {
            bringSelf(context);
            return;
        }
        if (context instanceof android.app.Activity) {
            ((android.app.Activity) context).moveTaskToBack(true);
        }
        ShortsGuardService service = instance.get();
        if (service != null) service.leaveReelsThenReturn();
        else bringSelf(context);
    }

    static void requestWatch(Context context, String target) {
        GuardState.beginWatch(context, target);
        if ("youtube".equals(target)) openYoutubeShorts(context);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        destroyed = false;
        instance = new WeakReference<>(this);
        mainHandler.removeCallbacks(watchTick);
        mainHandler.postDelayed(watchTick, 1000);
    }

    @Override
    public void onDestroy() {
        destroyed = true;
        mainHandler.removeCallbacksAndMessages(null);
        ShortsGuardService current = instance.get();
        if (current == this) instance = new WeakReference<>(null);
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || destroyed || closing || GuardState.isSuppressed(this)) return;
        CharSequence packageChars = event.getPackageName();
        if (packageChars == null) return;
        String packageName = packageChars.toString();
        if (!GuardScreens.isWatchedPackage(packageName)) return;
        int type = event.getEventType();
        if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            && type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            return;
        }
        long now = SystemClock.uptimeMillis();
        if (type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED && now - lastScanUptime < 800) {
            return;
        }
        lastScanUptime = now;

        String activePackage = activePackage();
        if (activePackage == null || !GuardScreens.isWatchedPackage(activePackage)) return;

        String kind = null;
        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            && GuardScreens.YOUTUBE.equals(activePackage)
            && GuardScreens.youtubeClassIsShorts(String.valueOf(event.getClassName()))) {
            kind = "youtube";
        } else if (activePackage.equals(packageName)) {
            kind = classifyActiveWindow();
        }
        if (kind == null) {
            noteAway(activePackage);
            return;
        }
        missedAway = 0;
        onTargetScreen(kind);
    }

    @Override
    public void onInterrupt() {}

    private void noteAway(String packageName) {
        missedAway += 1;
        if (missedAway < 2) return;
        missedAway = 0;
        String kind = GuardScreens.YOUTUBE.equals(packageName) ? "youtube" : "instagram";
        GuardState.clearPlayerSession(this, kind);
    }

    private void onTargetScreen(String kind) {
        if (GuardState.isSuppressed(this) || closing) return;
        if (kind.equals(GuardState.watchTarget(this))) return;
        long elapsed = SystemClock.elapsedRealtime();
        if (GuardState.isPrompting(this, kind)) {
            if (elapsed - lastLaunchElapsed > 1500) {
                lastLaunchElapsed = elapsed;
                if ("youtube".equals(kind)) closePlayerThenPrompt(kind);
                else bringSelfToFront();
            }
            return;
        }
        lastLaunchElapsed = elapsed;
        if ("youtube".equals(kind)) closePlayerThenPrompt(kind);
        else {
            GuardState.startPrompt(this, kind);
            bringSelfToFront();
        }
    }

    /**
     * YouTube keeps playing if it is only sent backward. Leave the Shorts task
     * with Back, then open Focus on. Reels: leave the player only, not Instagram.
     */
    private void closePlayerThenPrompt(String kind) {
        if (closing) return;
        closing = true;
        GuardState.suppress(this, 3000);
        GuardState.startPrompt(this, kind);
        if ("youtube".equals(kind)) pausePlayback();
        mainHandler.post(() -> stepAway(kind, 0));
    }

    private void stepAway(String kind, int attempt) {
        if (destroyed) {
            closing = false;
            return;
        }
        String packageName = activePackage();
        boolean youtube = "youtube".equals(kind);
        boolean stillApp = youtube
            ? GuardScreens.YOUTUBE.equals(packageName)
            : GuardScreens.INSTAGRAM.equals(packageName);
        boolean stillPlayer = kind.equals(classifyActiveWindow());
        int limit = youtube ? 6 : 3;
        boolean keepBacking = youtube ? stillApp && attempt < limit : stillPlayer && attempt < limit;
        if (packageName == null && attempt < limit + 2) {
            mainHandler.postDelayed(() -> stepAway(kind, attempt + 1), 200);
            return;
        }
        if (keepBacking) {
            performGlobalAction(GLOBAL_ACTION_BACK);
            mainHandler.postDelayed(() -> stepAway(kind, attempt + 1), 280);
            return;
        }
        bringSelfToFront();
        if (youtube) {
            mainHandler.postDelayed(() -> {
                if (!destroyed) stopYoutubeProcess();
                closing = false;
            }, 350);
            return;
        }
        closing = false;
    }

    private void leaveReelsThenReturn() {
        mainHandler.postDelayed(() -> stepAway("instagram", 0), 350);
    }

    private void pausePlayback() {
        AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) return;
        long now = SystemClock.uptimeMillis();
        audio.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PAUSE, 0));
        audio.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PAUSE, 0));
    }

    private void stopYoutubeProcess() {
        ActivityManager activities = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activities == null) return;
        activities.killBackgroundProcesses(GuardScreens.YOUTUBE);
    }

    private void tickWatch() {
        if (closing || GuardState.isSuppressed(this)) return;
        String kind = GuardState.watchTarget(this);
        if (kind.isEmpty()) {
            missedWatchChecks = 0;
            return;
        }
        String active = classifyActiveWindow();
        if (kind.equals(active)) {
            missedWatchChecks = 0;
            GuardState.addWatchSecond(this);
            return;
        }
        String packageName = activePackage();
        boolean sameApp = ("youtube".equals(kind) && GuardScreens.YOUTUBE.equals(packageName))
            || ("instagram".equals(kind) && GuardScreens.INSTAGRAM.equals(packageName));
        if (!sameApp && packageName != null && !GuardScreens.isWatchedPackage(packageName)) {
            return;
        }
        missedWatchChecks += 1;
        if (missedWatchChecks >= 2) {
            missedWatchChecks = 0;
            GuardState.endWatch(this);
        }
    }

    private String classifyActiveWindow() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return null;
        try {
            return classifyNode(root);
        } finally {
            root.recycle();
        }
    }

    private static String classifyNode(AccessibilityNodeInfo node) {
        CharSequence packageChars = node.getPackageName();
        if (packageChars == null) return null;
        String packageName = packageChars.toString();
        if (!GuardScreens.isWatchedPackage(packageName)) return null;
        return GuardScreens.classify(packageName, inspect(node));
    }

    private String activePackage() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return null;
        try {
            CharSequence packageChars = root.getPackageName();
            return packageChars == null ? null : packageChars.toString();
        } finally {
            root.recycle();
        }
    }

    private void bringSelfToFront() {
        bringSelf(this);
    }

    private static void bringSelf(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        context.startActivity(intent);
    }

    private static void openYoutubeShorts(Context context) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/shorts"));
        intent.setPackage(GuardScreens.YOUTUBE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
        } catch (RuntimeException ignored) {
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(GuardScreens.YOUTUBE);
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launch);
            }
        }
    }

    /**
     * Resource ids only. Does not call getText or read password fields.
     */
    private static GuardScreens.Hit inspect(AccessibilityNodeInfo root) {
        List<String> ids = new ArrayList<>();
        int[] count = new int[] {0};
        walk(root, ids, 0, count);
        return new GuardScreens.Hit(ids, false, false, false);
    }

    private static void walk(AccessibilityNodeInfo node, List<String> ids, int depth, int[] count) {
        if (node == null || depth > 30 || count[0] > 800) return;
        count[0] += 1;
        String id = node.getViewIdResourceName();
        if (id != null) ids.add(id);
        if (GuardScreens.classify(GuardScreens.YOUTUBE, ids) != null
            || GuardScreens.classify(GuardScreens.INSTAGRAM, ids) != null) {
            return;
        }
        int children = node.getChildCount();
        for (int i = 0; i < children && count[0] <= 800; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            walk(child, ids, depth + 1, count);
            child.recycle();
        }
    }
}

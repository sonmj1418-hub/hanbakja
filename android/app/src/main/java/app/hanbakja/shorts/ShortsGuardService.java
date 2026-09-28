package app.hanbakja.shorts;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

/**
 * Notices the YouTube Shorts player and the Instagram Reels player, then opens
 * 한박자. View resource ids are used only to tell those players apart. Text,
 * passwords, messages, and other apps are not read or stored.
 */
public class ShortsGuardService extends AccessibilityService {
    private static WeakReference<ShortsGuardService> instance = new WeakReference<>(null);

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int missedWatchChecks;
    private long lastScanUptime;
    private long lastLaunchElapsed;
    private boolean destroyed;

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

    static void requestLeave(android.content.Context context) {
        GuardState.idleAndSuppress(context, 4000);
        ShortsGuardService service = instance.get();
        if (service != null) {
            service.leaveScreenAndReturn();
        } else {
            bringHome(context);
        }
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
        if (event == null || destroyed) return;
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
        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            && GuardScreens.YOUTUBE.equals(packageName)
            && GuardScreens.youtubeClassIsShorts(String.valueOf(event.getClassName()))) {
            onTargetScreen("youtube");
            return;
        }
        String kind = classifyActiveWindow();
        if (kind == null) return;
        onTargetScreen(kind);
    }

    @Override
    public void onInterrupt() {}

    private void onTargetScreen(String kind) {
        if (GuardState.isSuppressed(this)) return;
        if (kind.equals(GuardState.watchTarget(this))) return;
        if (GuardState.isPrompting(this, kind)) {
            long elapsed = SystemClock.elapsedRealtime();
            if (elapsed - lastLaunchElapsed > 1500) {
                lastLaunchElapsed = elapsed;
                launchApp();
            }
            return;
        }
        GuardState.startPrompt(this, kind);
        lastLaunchElapsed = SystemClock.elapsedRealtime();
        launchApp();
    }

    private void tickWatch() {
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
            CharSequence packageChars = root.getPackageName();
            if (packageChars == null) return null;
            String packageName = packageChars.toString();
            if (!GuardScreens.isWatchedPackage(packageName)) return null;
            return GuardScreens.classify(packageName, collectIds(root));
        } finally {
            root.recycle();
        }
    }

    private void leaveScreenAndReturn() {
        mainHandler.postDelayed(() -> {
            if (destroyed) return;
            String kind = classifyActiveWindow();
            if (kind != null) {
                performGlobalAction(GLOBAL_ACTION_BACK);
                mainHandler.postDelayed(() -> {
                    if (destroyed) return;
                    if (classifyActiveWindow() != null) {
                        performGlobalAction(GLOBAL_ACTION_BACK);
                    }
                    mainHandler.postDelayed(() -> bringHome(ShortsGuardService.this), 450);
                }, 320);
            } else {
                bringHome(ShortsGuardService.this);
            }
        }, 350);
    }

    private void launchApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
    }

    private static void bringHome(android.content.Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        context.startActivity(intent);
    }

    /**
     * Resource ids only. Does not call getText, getHintText, or read editable fields.
     */
    private static List<String> collectIds(AccessibilityNodeInfo root) {
        List<String> ids = new ArrayList<>();
        int[] count = new int[] {0};
        walk(root, ids, 0, count);
        return ids;
    }

    private static void walk(AccessibilityNodeInfo node, List<String> ids, int depth, int[] count) {
        if (node == null || depth > 24 || count[0] > 400) return;
        count[0] += 1;
        String id = node.getViewIdResourceName();
        if (id != null) ids.add(id);
        int children = node.getChildCount();
        for (int i = 0; i < children && count[0] <= 400; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            walk(child, ids, depth + 1, count);
            child.recycle();
        }
    }
}

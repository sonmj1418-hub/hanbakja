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
        String kind = classifyEvent(event);
        if (kind == null) kind = classifyActiveWindow();
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

    private String classifyEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return null;
        try {
            return classifyNode(source);
        } finally {
            source.recycle();
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

    private void leaveScreenAndReturn() {
        mainHandler.postDelayed(() -> waitForTargetThenLeave(0), 400);
    }

    private void waitForTargetThenLeave(int attempt) {
        if (destroyed) return;
        if (attempt > 8) {
            bringHome(this);
            return;
        }
        String packageName = activePackage();
        if (packageName == null || !GuardScreens.isWatchedPackage(packageName)) {
            mainHandler.postDelayed(() -> waitForTargetThenLeave(attempt + 1), 200);
            return;
        }
        if (classifyActiveWindow() != null) {
            performGlobalAction(GLOBAL_ACTION_BACK);
            mainHandler.postDelayed(() -> {
                if (destroyed) return;
                if (classifyActiveWindow() != null) {
                    performGlobalAction(GLOBAL_ACTION_BACK);
                }
                mainHandler.postDelayed(() -> bringHome(ShortsGuardService.this), 400);
            }, 350);
            return;
        }
        bringHome(this);
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
     * Resource ids, view class names, and a selected Shorts/Reels tab label.
     * Does not call getText or read password fields, and does not keep labels.
     */
    private static GuardScreens.Hit inspect(AccessibilityNodeInfo root) {
        GuardScreens.Hit hit = new GuardScreens.Hit(new ArrayList<>(), false, false, false);
        int[] count = new int[] {0};
        boolean[] tabs = new boolean[] {false, false};
        boolean[] clips = new boolean[] {false};
        walk(root, hit.ids, tabs, clips, 0, count);
        return new GuardScreens.Hit(hit.ids, tabs[0], tabs[1], clips[0]);
    }

    private static void walk(
        AccessibilityNodeInfo node,
        List<String> ids,
        boolean[] tabs,
        boolean[] clips,
        int depth,
        int[] count
    ) {
        if (node == null || depth > 30 || count[0] > 800) return;
        if (tabs[0] || tabs[1] || clips[0]) return;
        count[0] += 1;
        String id = node.getViewIdResourceName();
        if (id != null) ids.add(id);
        CharSequence className = node.getClassName();
        if (className != null && GuardScreens.viewClassIsReels(className.toString())) {
            clips[0] = true;
        }
        if (!node.isPassword() && !node.isEditable()) {
            CharSequence description = node.getContentDescription();
            if (description != null) {
                boolean selected = node.isSelected() || node.isChecked();
                String kind = GuardScreens.selectedTabKind(description.toString(), selected);
                if ("youtube".equals(kind)) tabs[0] = true;
                else if ("instagram".equals(kind)) tabs[1] = true;
            }
        }
        if (tabs[0] || tabs[1] || clips[0] || playerMarkerFound(ids)) return;
        int children = node.getChildCount();
        for (int i = 0; i < children && count[0] <= 800; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            walk(child, ids, tabs, clips, depth + 1, count);
            child.recycle();
            if (tabs[0] || tabs[1] || clips[0]) return;
        }
    }

    private static boolean playerMarkerFound(List<String> ids) {
        return GuardScreens.classify(GuardScreens.YOUTUBE, ids) != null
            || GuardScreens.classify(GuardScreens.INSTAGRAM, ids) != null;
    }
}

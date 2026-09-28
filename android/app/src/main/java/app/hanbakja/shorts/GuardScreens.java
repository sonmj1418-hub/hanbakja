package app.hanbakja.shorts;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Decides whether a window is the YouTube Shorts player or the Instagram Reels
 * player. Resource ids and view class names are structural. A content
 * description is consulted only when it is a short selected tab label
 * (Shorts / 쇼츠 / Reels / 릴스) and is not kept.
 */
public final class GuardScreens {
    public static final String YOUTUBE = "com.google.android.youtube";
    public static final String INSTAGRAM = "com.instagram.android";

    /** Full-screen player containers. Home shelves and inline rows do not use these. */
    private static final String[] YOUTUBE_PLAYER = {
        "reel_player_page",
        "reel_player_underlay",
        "reel_player_container",
        "reel_watch_fragment"
    };

    /** Full-screen Reels viewer. Feed previews and stories do not use this. */
    private static final String[] INSTAGRAM_REELS = {
        "clips_viewer"
    };

    private GuardScreens() {}

    public static final class Hit {
        public final List<String> ids;
        public final boolean shortsTab;
        public final boolean reelsTab;
        public final boolean clipsClass;

        public Hit(List<String> ids, boolean shortsTab, boolean reelsTab, boolean clipsClass) {
            this.ids = ids == null ? Collections.emptyList() : ids;
            this.shortsTab = shortsTab;
            this.reelsTab = reelsTab;
            this.clipsClass = clipsClass;
        }
    }

    public static boolean isWatchedPackage(String packageName) {
        return YOUTUBE.equals(packageName) || INSTAGRAM.equals(packageName);
    }

    /** Activity class names only. Not a place to put captions or account text. */
    public static boolean youtubeClassIsShorts(String className) {
        if (className == null) return false;
        String lower = className.toLowerCase(Locale.ROOT);
        return lower.contains("reelwatch") || lower.contains("reel.watch");
    }

    /** View class names such as ClipsViewer. Stories use ReelViewer and do not match. */
    public static boolean viewClassIsReels(String className) {
        if (className == null) return false;
        return className.contains("Clips");
    }

    /**
     * Selected navigation tab only. Long captions, names, and typed text do not match.
     * @return "youtube", "instagram", or null
     */
    public static String selectedTabKind(String description, boolean selected) {
        if (!selected || description == null) return null;
        String trimmed = description.trim();
        if (trimmed.isEmpty() || trimmed.length() > 24) return null;
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.equals("shorts") || lower.equals("쇼츠")
            || lower.startsWith("shorts ") || trimmed.startsWith("쇼츠 ")) {
            return "youtube";
        }
        if (lower.equals("reels") || lower.equals("릴스")
            || lower.startsWith("reels ") || trimmed.startsWith("릴스 ")) {
            return "instagram";
        }
        return null;
    }

    public static String classify(String packageName, List<String> resourceIds) {
        return classify(packageName, new Hit(resourceIds, false, false, false));
    }

    public static String classify(String packageName, Hit hit) {
        if (packageName == null || hit == null) return null;
        if (YOUTUBE.equals(packageName)) {
            return containsMarker(hit.ids, YOUTUBE_PLAYER) ? "youtube" : null;
        }
        if (INSTAGRAM.equals(packageName)) {
            return containsMarker(hit.ids, INSTAGRAM_REELS) ? "instagram" : null;
        }
        return null;
    }

    private static boolean containsMarker(List<String> resourceIds, String[] markers) {
        if (resourceIds == null) return false;
        for (String id : resourceIds) {
            if (id == null || id.isEmpty()) continue;
            String leaf = id;
            int slash = id.lastIndexOf('/');
            if (slash >= 0 && slash + 1 < id.length()) {
                leaf = id.substring(slash + 1);
            }
            for (String marker : markers) {
                if (leaf.contains(marker)) return true;
            }
        }
        return false;
    }
}

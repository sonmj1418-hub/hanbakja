package app.hanbakja.shorts;

import java.util.List;

/**
 * Decides whether a window is the YouTube Shorts player or the Instagram Reels
 * player. Callers may pass view resource ids only. This class does not read
 * text, hints, or typed input.
 */
public final class GuardScreens {
    public static final String YOUTUBE = "com.google.android.youtube";
    public static final String INSTAGRAM = "com.instagram.android";

    private static final String[] YOUTUBE_PLAYER = {
        "reel_player_page",
        "reel_player_underlay",
        "reel_player_overlay",
        "reel_player_container",
        "reel_recycler",
        "reel_watch_fragment",
        "shorts_player"
    };

    private static final String[] INSTAGRAM_REELS = {
        "clips_viewer"
    };

    private GuardScreens() {}

    public static boolean isWatchedPackage(String packageName) {
        return YOUTUBE.equals(packageName) || INSTAGRAM.equals(packageName);
    }

    /** Activity class names only. Not a place to put captions or account text. */
    public static boolean youtubeClassIsShorts(String className) {
        if (className == null) return false;
        String lower = className.toLowerCase();
        return lower.contains("reelwatch") || lower.contains("reel.watch");
    }

    /**
     * @return "youtube", "instagram", or null when the ids are not that player
     */
    public static String classify(String packageName, List<String> resourceIds) {
        if (packageName == null || resourceIds == null) return null;
        if (YOUTUBE.equals(packageName)) {
            return containsMarker(resourceIds, YOUTUBE_PLAYER) ? "youtube" : null;
        }
        if (INSTAGRAM.equals(packageName)) {
            return containsMarker(resourceIds, INSTAGRAM_REELS) ? "instagram" : null;
        }
        return null;
    }

    private static boolean containsMarker(List<String> resourceIds, String[] markers) {
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

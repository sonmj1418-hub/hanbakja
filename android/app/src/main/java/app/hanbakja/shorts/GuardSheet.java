package app.hanbakja.shorts;

/**
 * YouTube Shorts and Instagram Reels share one overlay sheet. The practice
 * feed is not a target here, and its copy stays 쇼츠.
 */
public final class GuardSheet {
    private GuardSheet() {}

    public static boolean usesNativeSheet(String target) {
        return "youtube".equals(target) || "instagram".equals(target);
    }

    /** Sheet noun. Anything that is not Reels, including a missing target, stays 쇼츠. */
    public static String playerNoun(String target) {
        return "instagram".equals(target) ? "릴스" : "쇼츠";
    }

    public static String overlayUrl(String target) {
        requireSheet(target);
        return "https://localhost/watch/?guard=" + target;
    }

    public static String overlayMarker(String target) {
        requireSheet(target);
        return "<script>window.__HANBAKJA_OVERLAY__='" + target + "';</script>";
    }

    private static void requireSheet(String target) {
        if (!usesNativeSheet(target)) {
            throw new IllegalArgumentException("sheet target");
        }
    }
}

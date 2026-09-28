package app.hanbakja.shorts;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

public class GuardScreensTest {
    @Test
    public void detectsYoutubeShortsPlayerOnly() {
        assertEquals(
            "youtube",
            GuardScreens.classify(
                "com.google.android.youtube",
                Collections.singletonList("com.google.android.youtube:id/reel_player_page_container")
            )
        );
        assertEquals(
            "youtube",
            GuardScreens.classify(
                "com.google.android.youtube",
                Arrays.asList("com.google.android.youtube:id/watch_player", "com.google.android.youtube:id/reel_recycler")
            )
        );
        assertNull(
            GuardScreens.classify(
                "com.google.android.youtube",
                Collections.singletonList("com.google.android.youtube:id/watch_player")
            )
        );
        assertNull(
            GuardScreens.classify(
                "com.google.android.youtube",
                Collections.singletonList("com.google.android.youtube:id/shorts_shelf")
            )
        );
    }

    @Test
    public void detectsSelectedShortsAndReelsTabsOnly() {
        assertEquals("youtube", GuardScreens.selectedTabKind("Shorts", true));
        assertEquals("youtube", GuardScreens.selectedTabKind("쇼츠", true));
        assertEquals("instagram", GuardScreens.selectedTabKind("Reels", true));
        assertEquals("instagram", GuardScreens.selectedTabKind("릴스 탭", true));
        assertNull(GuardScreens.selectedTabKind("Shorts", false));
        assertNull(GuardScreens.selectedTabKind("shortcuts", true));
        assertNull(GuardScreens.selectedTabKind("오늘 본 릴스 캡션이 길어서 저장하면 안 되는 문장", true));
        assertEquals(
            "youtube",
            GuardScreens.classify(
                "com.google.android.youtube",
                new GuardScreens.Hit(Collections.emptyList(), true, false, false)
            )
        );
        assertEquals(
            "instagram",
            GuardScreens.classify(
                "com.instagram.android",
                new GuardScreens.Hit(Collections.emptyList(), false, true, false)
            )
        );
        assertNull(
            GuardScreens.classify(
                "com.google.android.youtube",
                new GuardScreens.Hit(Collections.emptyList(), false, true, false)
            )
        );
    }

    @Test
    public void detectsClipsClassButNotStoryClass() {
        assertTrue(GuardScreens.viewClassIsReels("com.instagram.clips.ClipsViewer"));
        assertFalse(GuardScreens.viewClassIsReels("com.instagram.reels.ReelViewer"));
        assertEquals(
            "instagram",
            GuardScreens.classify(
                "com.instagram.android",
                new GuardScreens.Hit(Collections.emptyList(), false, false, true)
            )
        );
    }

    @Test
    public void detectsInstagramReelsNotStories() {
        assertEquals(
            "instagram",
            GuardScreens.classify(
                "com.instagram.android",
                Collections.singletonList("com.instagram.android:id/clips_viewer_container")
            )
        );
        assertNull(
            GuardScreens.classify(
                "com.instagram.android",
                Collections.singletonList("com.instagram.android:id/reel_viewer_root")
            )
        );
    }

    @Test
    public void detectsYoutubeReelActivityClass() {
        assertTrue(GuardScreens.youtubeClassIsShorts(
            "com.google.android.apps.youtube.app.extensions.reel.watch.activity.ReelWatchActivity"
        ));
        assertFalse(GuardScreens.youtubeClassIsShorts("com.google.android.youtube.app.honeycomb.Shell$HomeActivity"));
    }

    @Test
    public void ignoresOtherPackages() {
        assertNull(
            GuardScreens.classify(
                "com.android.chrome",
                Collections.singletonList("com.google.android.youtube:id/reel_player_page_container")
            )
        );
        assertNull(GuardScreens.classify("com.google.android.youtube", (List<String>) null));
    }
}

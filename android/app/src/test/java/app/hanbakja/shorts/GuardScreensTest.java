package app.hanbakja.shorts;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
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
        assertNull(GuardScreens.classify("com.google.android.youtube", null));
    }
}

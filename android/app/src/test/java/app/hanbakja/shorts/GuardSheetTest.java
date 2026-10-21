package app.hanbakja.shorts;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class GuardSheetTest {
    @Test
    public void reelsUsesTheSameNativeSheetAsShorts() {
        assertTrue(GuardSheet.usesNativeSheet("youtube"));
        assertTrue(GuardSheet.usesNativeSheet("instagram"));
        assertFalse(GuardSheet.usesNativeSheet("practice"));
        assertFalse(GuardSheet.usesNativeSheet(null));
        assertFalse(GuardSheet.usesNativeSheet(""));

        assertEquals("쇼츠", GuardSheet.playerNoun("youtube"));
        assertEquals("릴스", GuardSheet.playerNoun("instagram"));
        assertEquals("쇼츠", GuardSheet.playerNoun(null));
        assertEquals("쇼츠", GuardSheet.playerNoun("practice"));

        assertEquals("https://localhost/watch/?guard=youtube", GuardSheet.overlayUrl("youtube"));
        assertEquals("https://localhost/watch/?guard=instagram", GuardSheet.overlayUrl("instagram"));
        assertEquals(
            "<script>window.__HANBAKJA_OVERLAY__='youtube';</script>",
            GuardSheet.overlayMarker("youtube")
        );
        assertEquals(
            "<script>window.__HANBAKJA_OVERLAY__='instagram';</script>",
            GuardSheet.overlayMarker("instagram")
        );
    }

    @Test
    public void overlayMarkerRejectsTargetsThatAreNotTheSheet() {
        try {
            GuardSheet.overlayUrl("practice");
            throw new AssertionError("practice must not open the sheet");
        } catch (IllegalArgumentException expected) {
            assertEquals("sheet target", expected.getMessage());
        }
        try {
            GuardSheet.overlayMarker("youtube';alert(1);//");
            throw new AssertionError("marker must not interpolate");
        } catch (IllegalArgumentException expected) {
            assertEquals("sheet target", expected.getMessage());
        }
    }
}

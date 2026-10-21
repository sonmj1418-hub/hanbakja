package app.focuson.shorts;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ShortsGuardServiceTest {
    @Test
    public void reelsUsesTheSameNativeSheetAsShorts() {
        assertTrue(ShortsGuardService.usesNativeSheet("youtube"));
        assertTrue(ShortsGuardService.usesNativeSheet("instagram"));
        assertFalse(ShortsGuardService.usesNativeSheet("practice"));
        assertFalse(ShortsGuardService.usesNativeSheet(null));
        assertFalse(ShortsGuardService.usesNativeSheet(""));
    }
}

package app.hanbakja.shorts;

import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HanbakjaGuard")
public class GuardPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isServiceEnabled());
        ret.put("pendingTarget", GuardState.pendingTarget(getContext()));
        ret.put("watching", GuardState.isWatching(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void takeWatch(PluginCall call) {
        GuardState.WatchTake take = GuardState.takeWatch(getContext());
        JSObject ret = new JSObject();
        ret.put("seconds", take.seconds);
        ret.put("ended", take.ended);
        call.resolve(ret);
    }

    @PluginMethod
    public void finish(PluginCall call) {
        String outcome = call.getString("outcome", "");
        String target = call.getString("target", "");
        if (!"youtube".equals(target) && !"instagram".equals(target)) {
            call.reject("대상 앱이 없습니다.");
            return;
        }
        if ("watch".equals(outcome)) {
            ShortsGuardService.requestWatch(getContext(), target);
            if ("instagram".equals(target) && getActivity() != null) {
                getActivity().moveTaskToBack(true);
            }
        } else if ("leave".equals(outcome) || "block".equals(outcome)) {
            android.content.Context host = getActivity() != null ? getActivity() : getContext();
            ShortsGuardService.requestLeave(host, target);
        } else {
            call.reject("알 수 없는 결과입니다.");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private boolean isServiceEnabled() {
        String enabled = Settings.Secure.getString(
            getContext().getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        if (TextUtils.isEmpty(enabled)) return false;
        String id = getContext().getPackageName() + "/" + ShortsGuardService.class.getName();
        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabled);
        while (splitter.hasNext()) {
            if (id.equalsIgnoreCase(splitter.next())) return true;
        }
        return false;
    }
}

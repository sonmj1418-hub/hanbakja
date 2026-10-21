import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nativeSheetHint,
  sheetLockConfirm,
  sheetLockOffer,
  sheetPlayerNoun,
  sheetReasonTitle,
  sheetWatchAgain,
  sheetWatchLabel,
} from "./sheet-copy.ts";

describe("sheet copy", () => {
  it("reels sheet says 릴스 and shorts sheet stays 쇼츠", () => {
    assert.equal(sheetPlayerNoun("Instagram Reels"), "릴스");
    assert.equal(sheetPlayerNoun("YouTube Shorts"), "쇼츠");
    assert.equal(sheetPlayerNoun(null), "쇼츠");
    assert.equal(sheetPlayerNoun(undefined), "쇼츠");

    assert.equal(sheetReasonTitle("Instagram Reels"), "왜 릴스를 실행하셨나요?");
    assert.equal(sheetReasonTitle("YouTube Shorts"), "왜 쇼츠를 실행하셨나요?");
    assert.equal(sheetReasonTitle(null), "왜 쇼츠를 실행하셨나요?");

    assert.equal(sheetWatchLabel("Instagram Reels"), "릴스 보기");
    assert.equal(sheetWatchLabel("YouTube Shorts"), "쇼츠 보기");
    assert.equal(sheetWatchLabel(null), "쇼츠 보기");

    assert.equal(sheetWatchAgain("Instagram Reels"), "릴스를 볼지");
    assert.equal(sheetWatchAgain(null), "쇼츠를 볼지");

    const reelsHint = nativeSheetHint("Instagram Reels");
    const shortsHint = nativeSheetHint("YouTube Shorts");
    assert.match(reelsHint, /릴스/);
    assert.doesNotMatch(reelsHint, /쇼츠/);
    assert.match(shortsHint, /쇼츠/);
    assert.doesNotMatch(shortsHint, /릴스/);
    assert.equal(nativeSheetHint(null), "");

    assert.match(sheetLockOffer("Instagram Reels"), /릴스 열기/);
    assert.match(sheetLockOffer("YouTube Shorts"), /쇼츠 열기/);
    assert.match(sheetLockOffer(null), /쇼츠 열기/);
    assert.match(sheetLockConfirm("Instagram Reels"), /릴스 피드/);
    assert.match(sheetLockConfirm(null), /쇼츠 피드/);
  });
});

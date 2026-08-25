import test from "node:test";
import assert from "node:assert/strict";
import {
  createOfficialAccountTextReply,
  officialAccountSignature,
  officialAccountXmlText,
  verifyOfficialAccountSignature,
} from "../src/wechat-official.js";

test("verifies an official-account callback signature", () => {
  const token = "callback-token";
  const timestamp = "1710000000";
  const nonce = "123456";
  const signature = officialAccountSignature(token, timestamp, nonce);
  assert.doesNotThrow(() =>
    verifyOfficialAccountSignature({ token, timestamp, nonce, signature }),
  );
});

test("reads official-account XML and creates a text reply", () => {
  assert.equal(
    officialAccountXmlText(
      "<xml><Content><![CDATA[hello]]></Content></xml>",
      "Content",
    ),
    "hello",
  );
  assert.match(
    createOfficialAccountTextReply({
      toUser: "customer",
      fromUser: "account",
      content: "归档完成",
    }),
    /<Content><!\[CDATA\[归档完成\]\]><\/Content>/,
  );
});


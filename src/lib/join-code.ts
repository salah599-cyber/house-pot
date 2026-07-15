import { randomBytes } from "crypto";

import { JOIN_CODE_LENGTH } from "@/lib/constants";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createJoinCode(length = JOIN_CODE_LENGTH) {
  const bytes = randomBytes(length);
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += CHARSET[bytes[index] % CHARSET.length];
  }

  return code;
}

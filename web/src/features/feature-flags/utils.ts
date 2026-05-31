import { availableFlags } from "./available-flags";
import { type Flags } from "./types";

export const parseFlags = (dbFlags: string[] | null | undefined): Flags => {
  const parsedFlags = {} as Flags;

  // 处理 null 或 undefined 的情况
  if (!dbFlags || !Array.isArray(dbFlags)) {
    availableFlags.forEach((flag) => {
      parsedFlags[flag] = false;
    });
    return parsedFlags;
  }

  availableFlags.forEach((flag) => {
    parsedFlags[flag] = dbFlags.includes(flag);
  });

  return parsedFlags;
};

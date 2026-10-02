import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { ADMIN_UID, createTestEnv, INACTIVE_ADMIN_UID, OTHER_UID, seedAdmins, USER_UID } from "./test-env";

let env: RulesTestEnvironment;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MB = 1024 * 1024;

type Storage = ReturnType<ReturnType<RulesTestEnvironment["unauthenticatedContext"]>["storage"]>;

const anon = () => env.unauthenticatedContext().storage();
const user = (uid = USER_UID) => env.authenticatedContext(uid).storage();
const admin = () => env.authenticatedContext(ADMIN_UID).storage();
const inactiveAdmin = () => env.authenticatedContext(INACTIVE_ADMIN_UID).storage();

// UploadTask is only thenable; wrap it so assertSucceeds/assertFails get a real Promise.
async function upload(storage: Storage, path: string, contentType = "image/png", bytes: Uint8Array = PNG) {
  await storage.ref(path).put(bytes, { contentType });
}

async function seedFile(path: string) {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.storage().ref(path).put(PNG, { contentType: "image/png" });
  });
}

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await seedAdmins(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe.each(["questionnaires", "questionnaireCategories", "tips", "advertisers"])("content/%s", (area) => {
  const path = `content/${area}/entity-1/cover.png`;

  it("anyone reads content images", async () => {
    await seedFile(path);
    await assertSucceeds(anon().ref(path).getDownloadURL());
  });

  it("an active admin uploads images up to 5 MB", async () => {
    await assertSucceeds(upload(admin(), path));
  });

  it("rejects non-admins and inactive admins", async () => {
    await assertFails(upload(user(), path));
    await assertFails(upload(inactiveAdmin(), path));
    await assertFails(upload(anon(), path));
  });

  it("rejects files that are not images or are too big", async () => {
    await assertFails(upload(admin(), `content/${area}/entity-1/doc.pdf`, "application/pdf"));
    await assertFails(upload(admin(), path, "image/png", new Uint8Array(5 * MB + 1)));
  });

  it("only admins delete", async () => {
    await seedFile(path);
    await assertFails(user().ref(path).delete());
    await assertSucceeds(admin().ref(path).delete());
  });
});

describe("content in unknown areas", () => {
  it("is closed", async () => {
    await assertFails(upload(admin(), "content/other/entity-1/x.png"));
  });
});

describe("users/{uid}/avatar", () => {
  const path = `users/${USER_UID}/avatar/me.png`;

  it("the owner uploads an image up to 2 MB and reads it", async () => {
    await assertSucceeds(upload(user(), path));
    await assertSucceeds(user().ref(path).getDownloadURL());
  });

  it("rejects big or non-image files", async () => {
    await assertFails(upload(user(), path, "image/png", new Uint8Array(2 * MB + 1)));
    await assertFails(upload(user(), path, "text/plain"));
  });

  it("other users cannot read or write it", async () => {
    await seedFile(path);
    await assertFails(user(OTHER_UID).ref(path).getDownloadURL());
    await assertFails(upload(user(OTHER_UID), path));
  });
});

describe("users/{uid}/generated", () => {
  const path = `users/${USER_UID}/generated/result.png`;

  it("the owner reads results written by the server", async () => {
    await seedFile(path);
    await assertSucceeds(user().ref(path).getDownloadURL());
    await assertFails(user(OTHER_UID).ref(path).getDownloadURL());
  });

  it("nobody uploads results from the client", async () => {
    await assertFails(upload(user(), path));
  });
});

describe("unknown paths", () => {
  it("are closed", async () => {
    await assertFails(upload(admin(), "random/x.png"));
  });
});

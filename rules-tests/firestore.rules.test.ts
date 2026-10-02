import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { ADMIN_UID, createTestEnv, INACTIVE_ADMIN_UID, OTHER_UID, seedAdmins, USER_UID } from "./test-env";

let env: RulesTestEnvironment;

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid = USER_UID) => env.authenticatedContext(uid).firestore();
const admin = () => env.authenticatedContext(ADMIN_UID).firestore();
const inactiveAdmin = () => env.authenticatedContext(INACTIVE_ADMIN_UID).firestore();

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled((context) => context.firestore().doc(path).set(data));
}

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe.each(["questionnaireCategories", "tipCategories", "tips", "advertisers"])(
  "%s (status active/inactive)",
  (collection) => {
    beforeEach(async () => {
      await seed(`${collection}/on`, { status: "active", order: 1 });
      await seed(`${collection}/off`, { status: "inactive", order: 2 });
    });

    it("anyone reads active documents, even signed out", async () => {
      await assertSucceeds(anon().doc(`${collection}/on`).get());
      await assertSucceeds(user().doc(`${collection}/on`).get());
    });

    it("hides inactive documents from non-admins", async () => {
      await assertFails(anon().doc(`${collection}/off`).get());
      await assertFails(user().doc(`${collection}/off`).get());
    });

    it("allows querying active documents and rejects unfiltered queries", async () => {
      await assertSucceeds(anon().collection(collection).where("status", "==", "active").get());
      await assertFails(anon().collection(collection).get());
    });

    it("admin reads everything", async () => {
      await assertSucceeds(admin().doc(`${collection}/off`).get());
      await assertSucceeds(admin().collection(collection).get());
    });

    it("only an active admin writes, with a valid status", async () => {
      await assertSucceeds(admin().doc(`${collection}/new`).set({ status: "active", order: 3 }));
      await assertFails(admin().doc(`${collection}/bad`).set({ status: "published", order: 3 }));
      await assertFails(user().doc(`${collection}/new2`).set({ status: "active", order: 3 }));
      await assertFails(inactiveAdmin().doc(`${collection}/new3`).set({ status: "active", order: 3 }));
      await assertFails(anon().doc(`${collection}/new4`).set({ status: "active", order: 3 }));
    });

    it("only an admin deletes", async () => {
      await assertFails(user().doc(`${collection}/on`).delete());
      await assertSucceeds(admin().doc(`${collection}/on`).delete());
    });
  },
);

describe("questionnaires and steps", () => {
  beforeEach(async () => {
    await seed("questionnaires/pub", { status: "published", categoryId: "c1", order: 1 });
    await seed("questionnaires/draft", { status: "draft", categoryId: "c1", order: 2 });
    await seed("questionnaires/pub/steps/s1", { type: "question", order: 1 });
    await seed("questionnaires/draft/steps/s1", { type: "question", order: 1 });
  });

  it("anyone reads published questionnaires and their steps", async () => {
    await assertSucceeds(anon().doc("questionnaires/pub").get());
    await assertSucceeds(anon().doc("questionnaires/pub/steps/s1").get());
    await assertSucceeds(anon().collection("questionnaires/pub/steps").orderBy("order").get());
  });

  it("hides drafts and their steps from non-admins", async () => {
    await assertFails(user().doc("questionnaires/draft").get());
    await assertFails(user().doc("questionnaires/draft/steps/s1").get());
  });

  it("supports the app query: published questionnaires of a category", async () => {
    await assertSucceeds(
      anon()
        .collection("questionnaires")
        .where("status", "==", "published")
        .where("categoryId", "==", "c1")
        .orderBy("order")
        .get(),
    );
  });

  it("admin reads drafts and writes questionnaires with a valid status", async () => {
    await assertSucceeds(admin().doc("questionnaires/draft/steps/s1").get());
    await assertSucceeds(admin().doc("questionnaires/q2").set({ status: "draft", categoryId: "c1", order: 3 }));
    await assertFails(admin().doc("questionnaires/q3").set({ status: "active", categoryId: "c1", order: 3 }));
    await assertFails(user().doc("questionnaires/q4").set({ status: "draft", categoryId: "c1", order: 3 }));
  });

  it("admin writes steps of type video or question only", async () => {
    await assertSucceeds(admin().doc("questionnaires/pub/steps/s2").set({ type: "video", order: 2 }));
    await assertFails(admin().doc("questionnaires/pub/steps/s3").set({ type: "slide", order: 3 }));
    await assertFails(user().doc("questionnaires/pub/steps/s4").set({ type: "video", order: 4 }));
  });

  it("a published questionnaire cannot be edited by a user", async () => {
    await assertFails(user().doc("questionnaires/pub").update({ status: "draft" }));
  });
});

describe("admins", () => {
  it("is unreachable from the client SDK, even for admins", async () => {
    await assertFails(admin().doc(`admins/${ADMIN_UID}`).get());
    await assertFails(user().doc(`admins/${USER_UID}`).set({ email: "x", active: true }));
    await assertFails(admin().collection("admins").get());
  });
});

describe("users/{uid}", () => {
  const profile = { displayName: "Diego", photoUrl: null, language: "pt" };

  it("a user creates and reads their own profile", async () => {
    await assertSucceeds(user().doc(`users/${USER_UID}`).set(profile));
    await assertSucceeds(user().doc(`users/${USER_UID}`).get());
  });

  it("a user cannot give themselves credits", async () => {
    await assertFails(user().doc(`users/${USER_UID}`).set({ ...profile, creditBalance: 1000 }));
    await seed(`users/${USER_UID}`, { ...profile, creditBalance: 10 });
    await assertFails(user().doc(`users/${USER_UID}`).update({ creditBalance: 1000 }));
  });

  it("a user updates profile fields only", async () => {
    await seed(`users/${USER_UID}`, { ...profile, creditBalance: 10 });
    await assertSucceeds(user().doc(`users/${USER_UID}`).update({ displayName: "Diego S.", language: "en" }));
    await assertFails(user().doc(`users/${USER_UID}`).update({ language: "fr" }));
    await assertFails(user().doc(`users/${USER_UID}`).update({ role: "admin" }));
  });

  it("a user cannot read, create or delete another user's profile", async () => {
    await seed(`users/${OTHER_UID}`, profile);
    await assertFails(user().doc(`users/${OTHER_UID}`).get());
    await assertFails(user().doc(`users/${OTHER_UID}`).set(profile));
    await assertFails(user(OTHER_UID).doc(`users/${OTHER_UID}`).delete());
    await assertFails(anon().doc(`users/${OTHER_UID}`).get());
  });

  it("admin reads any profile", async () => {
    await seed(`users/${USER_UID}`, profile);
    await assertSucceeds(admin().doc(`users/${USER_UID}`).get());
  });
});

describe("users/{uid}/history", () => {
  beforeEach(async () => {
    await seed(`users/${USER_UID}/history/h1`, { prompt: "p", creditsSpent: 1 });
  });

  it("the owner reads and deletes their entries", async () => {
    await assertSucceeds(user().doc(`users/${USER_UID}/history/h1`).get());
    await assertSucceeds(user().collection(`users/${USER_UID}/history`).orderBy("createdAt", "desc").get());
    await assertSucceeds(user().doc(`users/${USER_UID}/history/h1`).delete());
  });

  it("nobody writes history from the client", async () => {
    await assertFails(user().doc(`users/${USER_UID}/history/h2`).set({ prompt: "p", creditsSpent: 0 }));
    await assertFails(user().doc(`users/${USER_UID}/history/h1`).update({ creditsSpent: 0 }));
    await assertFails(admin().doc(`users/${USER_UID}/history/h3`).set({ prompt: "p" }));
  });

  it("other users cannot read it", async () => {
    await assertFails(user(OTHER_UID).doc(`users/${USER_UID}/history/h1`).get());
    await assertFails(user(OTHER_UID).doc(`users/${USER_UID}/history/h1`).delete());
  });
});

describe("users/{uid}/credits", () => {
  beforeEach(async () => {
    await seed(`users/${USER_UID}/credits/t1`, { kind: "purchase", amount: 40, balanceAfter: 40 });
  });

  it("the owner and admins read the statement", async () => {
    await assertSucceeds(user().doc(`users/${USER_UID}/credits/t1`).get());
    await assertSucceeds(admin().doc(`users/${USER_UID}/credits/t1`).get());
  });

  it("nobody writes credits from the client", async () => {
    await assertFails(user().doc(`users/${USER_UID}/credits/t2`).set({ kind: "bonus", amount: 1000, balanceAfter: 1040 }));
    await assertFails(user().doc(`users/${USER_UID}/credits/t1`).delete());
    await assertFails(admin().doc(`users/${USER_UID}/credits/t3`).set({ kind: "bonus", amount: 1 }));
  });

  it("other users cannot read it", async () => {
    await assertFails(user(OTHER_UID).doc(`users/${USER_UID}/credits/t1`).get());
  });
});

describe("unknown collections", () => {
  it("are closed", async () => {
    await assertFails(admin().doc("anything/x").set({ a: 1 }));
    await assertFails(anon().doc("anything/x").get());
  });
});

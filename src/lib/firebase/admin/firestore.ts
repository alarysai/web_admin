import "server-only";

import { getFirestore } from "firebase-admin/firestore";

import { getAdminApp } from "./app";

export const getAdminFirestore = () => getFirestore(getAdminApp());

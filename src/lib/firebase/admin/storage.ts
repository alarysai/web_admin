import "server-only";

import { getStorage } from "firebase-admin/storage";

import { getAdminApp } from "./app";

export const getAdminStorage = () => getStorage(getAdminApp());

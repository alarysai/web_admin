import type { SignInErrorCode } from "../data/admin-sign-in";

export const LOGIN_ERROR_MESSAGES: Record<SignInErrorCode, string> = {
  "invalid-credentials": "E-mail ou senha incorretos.",
  "not-admin": "Este usuário não tem acesso ao painel. Fale com um administrador.",
  "too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  network: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível entrar. Tente de novo.",
};

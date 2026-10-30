export const AVISO_BRAVE =
  'O Brave não tem o serviço de voz do Google, então o reconhecimento de voz não funciona aqui. Use o Chrome ou o Edge para falar com o Jarvis. O campo de texto continua funcionando.';

interface NavegadorComBrave {
  brave?: { isBrave?: () => Promise<boolean> };
}

/** O Brave se identifica como Chrome no user agent; só a API própria dele o denuncia. */
export async function isBrave(navegador: NavegadorComBrave): Promise<boolean> {
  try {
    return (await navegador.brave?.isBrave?.()) === true;
  } catch {
    return false;
  }
}

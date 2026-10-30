const FUSO_COTA = 'America/Los_Angeles';

function partesNoFuso(instante: number) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_COTA,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
  }).formatToParts(instante);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { ano: valor('year'), mes: valor('month'), dia: valor('day'), hora: valor('hour') };
}

/** A cota diária do Gemini renova à meia-noite do horário do Pacífico. */
export function proximaRenovacaoDeCota(agora: number): number {
  const { ano, mes, dia } = partesNoFuso(agora);
  // 08:00 UTC é meia-noite no horário padrão; no horário de verão cai à 01:00 e é ajustado.
  const estimativa = Date.UTC(ano, mes - 1, dia + 1, 8);
  return estimativa - partesNoFuso(estimativa).hora * 60 * 60 * 1000;
}

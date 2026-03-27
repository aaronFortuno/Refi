import type { TourStep } from './Tour'

function expandSection(tourAttr: string) {
  const section = document.querySelector(`[data-tour="${tourAttr}"]`)
  if (!section) return
  // Si la secció està col·lapsada (no té el contingut visible), fer clic al botó
  const content = section.querySelector('[data-tour-content]')
  if (!content) {
    const btn = section.querySelector('button')
    btn?.click()
  }
}

export const tourSteps: TourStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Benvingut a Refi!',
    content: 'Aquesta eina et permet simular escenaris de refinançament de préstecs, calcular estalvis i comparar opcions. Totes les dades es queden al teu dispositiu, mai surten a cap servidor.',
    position: 'bottom',
  },
  {
    target: '[data-tour="export-import"]',
    title: 'Exportar, importar i netejar',
    content: 'Pots exportar les teves dades com a fitxer JSON per fer-ne còpia de seguretat o continuar en un altre dispositiu. També pots importar dades prèvies o netejar-ho tot per començar de zero.',
    position: 'bottom',
  },
  {
    target: '[data-tour="loans"]',
    title: 'Préstecs actuals',
    content: 'Aquí veuràs els teus préstecs. Per a cada un, indica el capital pendent, el TIN (fix o variable amb Euríbor + diferencial), les quotes restants, penalitzacions i costos vinculats (assegurances, manteniment, bonificacions). Fes clic a un préstec per veure\'n el quadre d\'amortització.',
    position: 'bottom',
    beforeShow: () => expandSection('loans'),
  },
  {
    target: '[data-tour="add-loan"]',
    title: 'Afegir un préstec',
    content: 'Fes clic aquí per crear un nou préstec. Pots afegir fins a 6 préstecs. Hem carregat dades d\'exemple perquè puguis explorar l\'eina, les pots modificar o esborrar.',
    position: 'bottom',
    beforeShow: () => expandSection('loans'),
  },
  {
    target: '[data-tour="partial-amort"]',
    title: 'Simulador d\'amortització parcial',
    content: 'Selecciona un préstec, introdueix un import i veuràs al moment l\'efecte: reduir quota (mateixa durada, pagues menys al mes) o reduir termini (mateixa quota, acabes abans). L\'slider permet ajustar ràpidament.',
    position: 'bottom',
    beforeShow: () => expandSection('partial-amort'),
  },
  {
    target: '[data-tour="insurance-analysis"]',
    title: 'Anàlisi de costos vinculats',
    content: 'Si has afegit assegurances, manteniment de compte o bonificacions (nòmina domiciliada) als préstecs, aquí veuràs si cada cost val la pena mantenir-lo o eliminar-lo, comparant el cost anual amb l\'estalvi en interessos.',
    position: 'left',
    beforeShow: () => expandSection('insurance-analysis'),
  },
  {
    target: '[data-tour="scenarios"]',
    title: 'Escenaris de refinançament',
    content: 'Crea escenaris per simular "què passaria si agafo un préstec nou per amortitzar un d\'existent?". Pots cancel·lar totalment o parcialment, triar reduir quota o termini, i veure l\'estalvi net en temps real. Si tens 2+ escenaris, es comparen automàticament.',
    position: 'top',
    beforeShow: () => expandSection('scenarios'),
  },
]

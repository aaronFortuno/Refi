import ca from './ca'

type Translations = typeof ca

// Per ara només català, però preparat per ampliar
const translations: Record<string, Translations> = { ca }

let currentLang = 'ca'

export function t(path: string): string {
  const keys = path.split('.')
  let result: unknown = translations[currentLang]
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Retorna la clau si no es troba
    }
  }
  return typeof result === 'string' ? result : path
}

export function setLanguage(lang: string): void {
  if (lang in translations) {
    currentLang = lang
  }
}

export function getCurrentLanguage(): string {
  return currentLang
}

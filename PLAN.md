# Simulador de Refinançament — Pla de Projecte

## 1. Visió general

Aplicació web estàtica (SPA) que permet a un usuari domèstic simular escenaris de refinançament de préstecs, amortització anticipada i optimització de costos financers (incloent assegurances vinculades). Totes les dades romanen al dispositiu de l'usuari.

## 2. Stack tecnològic

| Component | Tecnologia |
|-----------|-----------|
| Framework | React 18+ amb TypeScript strict |
| Bundler | Vite |
| Estils | Tailwind CSS |
| Persistència | LocalStorage + export/import JSON |
| i18n | Claus amb fitxer de traduccions (només `ca` inicialment) |
| Testing | Vitest (unitaris) + Testing Library (components) |
| Deploy | GitHub Actions → GitHub Pages |

## 3. Model de dades

### 3.1 Préstec (`Loan`)

```typescript
interface Loan {
  id: string
  nom: string
  capitalPendent: number        // € pendent de pagar
  tin: number                   // Tipus d'interès nominal anual (%)
  tipusInteres: 'fix' | 'variable'

  // Només si variable:
  indexReferencia?: number       // Euríbor actual (%)
  diferencial?: number           // Diferencial sobre Euríbor (%)
  dataProperaRevisio?: string    // ISO date
  projeccionsEuribor?: ProjectionEntry[]  // Si buit, hereta anterior

  quotesRestants: number         // Nombre de quotes mensuals pendents

  penalitzacio: {
    amortitzacioTotal: Penalty
    amortitzacioParcial: Penalty
  }

  assegurances: Insurance[]

  // Per a préstecs nous (refinançament):
  comissioObertura?: number      // € o %
  comissioOberturaType?: 'percentatge' | 'fix'
}

interface ProjectionEntry {
  any: number                    // Ex: 2027
  euribor: number | null         // null = hereta del període anterior
}

interface Penalty {
  valor: number
  tipus: 'percentatge' | 'fix'   // % sobre capital pendent o import fix
}

interface Insurance {
  id: string
  nom: string
  costAnual: number              // €/any
  obligatoria: boolean
  diferencialSense?: number      // Diferencial si es cancel·la l'assegurança (%)
}
```

### 3.2 Escenari (`Scenario`)

```typescript
interface Scenario {
  id: string
  nom: string
  descripcio?: string
  prestecsCancelats: CancelAction[]  // Préstecs existents que es cancel·len
  prestecsNous: Loan[]               // Préstecs nous per refinançar
}

interface CancelAction {
  loanId: string
  tipus: 'total' | 'parcial'
  importParcial?: number             // € si és parcial
}
```

### 3.3 Estat global (`AppState`)

```typescript
interface AppState {
  prestecs: Loan[]                   // Màxim 6
  escenaris: Scenario[]
  configuracio: {
    idioma: 'ca'
  }
}
```

## 4. Motor de càlcul

### 4.1 Amortització francesa

```
Quota mensual = C × r / (1 - (1 + r)^(-n))

On:
  C = capital pendent
  r = TIN mensual (TIN anual / 12 / 100)
  n = quotes restants
```

Per cada quota:
- Interessos = Capital pendent × r
- Amortització capital = Quota − Interessos
- Nou capital pendent = Capital anterior − Amortització capital

### 4.2 Préstecs variables

Quan canvia l'Euríbor (en cada revisió o segons projecció anual):
1. Agafar l'Euríbor projectat per a aquell any (o heretat del període anterior)
2. Nou TIN = Euríbor projectat + diferencial
3. Recalcular la quota amb el capital pendent en aquell moment i les quotes restants

### 4.3 Càlcul d'estalvi d'un escenari

```
Cost situació actual:
  = Σ(quotes restants × quota) + Σ(assegurances × anys restants)
  = Total interessos + Total assegurances

Cost refinançament:
  = Penalitzacions cancel·lació
  + Comissions obertura nous préstecs
  + Σ(quotes noves × quota nova)
  + Σ(assegurances noves × anys nous)

Estalvi net = Cost actual − Cost refinançament
Break-even = mes en què l'estalvi acumulat supera els costos inicials
```

### 4.4 Simulació d'assegurances

Per a cada assegurança no obligatòria:
- Calcular cost total de l'assegurança durant la vida restant del préstec
- Calcular el cost extra d'interessos si s'elimina (diferencial puja)
- Si cost assegurança > cost extra interessos → recomanar cancel·lar

## 5. Estructura de fitxers

```
refi/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Layout principal
│   │
│   ├── types/
│   │   └── index.ts                # Interfaces del model de dades
│   │
│   ├── engine/                     # Motor de càlcul (lògica pura, 0 deps de React)
│   │   ├── amortization.ts         # Quadre d'amortització francès
│   │   ├── refinancing.ts          # Càlcul d'escenaris de refinançament
│   │   ├── insurance.ts            # Simulació rendibilitat assegurances
│   │   ├── projections.ts          # Resolució projeccions Euríbor
│   │   └── comparator.ts           # Comparació side-by-side d'escenaris
│   │
│   ├── store/
│   │   ├── context.tsx             # React Context + reducer
│   │   └── persistence.ts          # LocalStorage + JSON export/import
│   │
│   ├── i18n/
│   │   ├── index.ts                # Hook useTranslation
│   │   └── ca.ts                   # Traduccions en català
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx         # Navegació entre seccions
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── loans/
│   │   │   ├── LoanList.tsx        # Llista de préstecs actuals
│   │   │   ├── LoanForm.tsx        # Formulari crear/editar préstec
│   │   │   ├── LoanSummary.tsx     # Resum d'un préstec (cost total, interessos)
│   │   │   └── AmortizationTable.tsx  # Quadre d'amortització (mensual/anual)
│   │   │
│   │   ├── euribor/
│   │   │   └── EuriborProjections.tsx  # Editor de projeccions any per any
│   │   │
│   │   ├── insurance/
│   │   │   ├── InsuranceForm.tsx
│   │   │   └── InsuranceAnalysis.tsx   # Anàlisi cost/benefici
│   │   │
│   │   ├── scenarios/
│   │   │   ├── ScenarioList.tsx
│   │   │   ├── ScenarioEditor.tsx      # Configurar un escenari
│   │   │   ├── ScenarioResult.tsx      # Resultat d'un escenari
│   │   │   └── ScenarioComparator.tsx  # Comparació side-by-side
│   │   │
│   │   ├── simulation/
│   │   │   ├── PartialAmortization.tsx  # Simular amortització parcial
│   │   │   └── AmortizationOptions.tsx  # Reduir quota vs reduir termini
│   │   │
│   │   └── shared/
│   │       ├── MoneyCell.tsx        # Cel·la amb format €, color verd/vermell
│   │       ├── PercentageInput.tsx  # Input de percentatge amb validació
│   │       ├── DataTable.tsx        # Taula genèrica amb col·lapse anual
│   │       └── ExportImport.tsx     # Botons export/import JSON
│   │
│   └── utils/
│       ├── formatting.ts           # Format €, %, dates
│       └── validation.ts           # Validacions de formulari
│
├── tests/
│   ├── engine/
│   │   ├── amortization.test.ts
│   │   ├── refinancing.test.ts
│   │   ├── insurance.test.ts
│   │   ├── projections.test.ts
│   │   └── comparator.test.ts
│   └── components/
│       ├── LoanForm.test.tsx
│       ├── AmortizationTable.test.tsx
│       └── ScenarioComparator.test.tsx
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # Build + deploy a GitHub Pages
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── PLAN.md
```

## 6. Fases d'entrega

### Fase 1 — Fonaments (engine + préstecs)
**Entregable:** Es poden crear préstecs i veure'n el quadre d'amortització.

1. Scaffold del projecte (Vite + React + TS + Tailwind)
2. Model de dades (`types/index.ts`)
3. Motor d'amortització francesa (`engine/amortization.ts`) + tests
4. Persistència LocalStorage (`store/persistence.ts`)
5. Context global (`store/context.tsx`)
6. Formulari de préstec (`LoanForm.tsx`)
7. Quadre d'amortització amb vista mensual/anual (`AmortizationTable.tsx`)
8. Layout bàsic (Header, Sidebar)
9. i18n bàsic amb claus en català

**Tests unitaris fase 1:**
- `amortization.test.ts`: Quota correcta per a préstec fix, quadre sencer suma = capital + interessos, arrodoniments
- `persistence.test.ts`: Guardar/carregar/exportar/importar JSON

### Fase 2 — Préstecs variables + Euríbor
**Entregable:** Suport complet per a préstecs variables amb projeccions.

1. Resolució de projeccions Euríbor amb herència (`engine/projections.ts`) + tests
2. Recàlcul de quota en revisió per a préstecs variables
3. Editor de projeccions Euríbor (`EuriborProjections.tsx`)
4. Integrar Euríbor al quadre d'amortització

**Tests unitaris fase 2:**
- `projections.test.ts`: Herència de valor anterior, canvis de tipus, recàlcul de quota correcte
- `amortization.test.ts`: Ampliar amb casos variables (canvi de quota en revisió)

### Fase 3 — Escenaris de refinançament
**Entregable:** Es poden crear escenaris, veure el resultat i comparar-los.

1. Motor de refinançament (`engine/refinancing.ts`) + tests
2. Motor de comparació (`engine/comparator.ts`) + tests
3. Editor d'escenaris (`ScenarioEditor.tsx`)
4. Resultat d'escenari amb estalvi net i break-even (`ScenarioResult.tsx`)
5. Comparació side-by-side (`ScenarioComparator.tsx`)

**Tests unitaris fase 3:**
- `refinancing.test.ts`: Penalització correcta, cost total nou préstec, estalvi net, break-even
- `comparator.test.ts`: Ordenació d'escenaris per estalvi, comparació de múltiples escenaris

### Fase 4 — Assegurances i amortització parcial
**Entregable:** Simulació completa d'assegurances i amortització parcial.

1. Motor d'assegurances (`engine/insurance.ts`) + tests
2. Anàlisi cost/benefici d'assegurances (`InsuranceAnalysis.tsx`)
3. Simulador d'amortització parcial: reducció de quota vs termini (`PartialAmortization.tsx`)

**Tests unitaris fase 4:**
- `insurance.test.ts`: Llindar de rendibilitat, comparació amb/sense assegurança
- Ampliar `amortization.test.ts`: Amortització parcial amb reducció de quota i de termini

### Fase 5 — Polish i deploy
**Entregable:** Aplicació desplegada i funcional a GitHub Pages.

1. Export/import JSON (`ExportImport.tsx`)
2. Codi de color a taules (verd estalvi, vermell cost)
3. Validació de formularis completa
4. Responsive (adaptar a mòbil)
5. GitHub Actions workflow per deploy
6. Revisió general i correccions

### Fase 6 (futur) — Extras
- Exportació PDF/CSV
- Gràfics (evolució capital, comparativa interessos)
- Més idiomes

## 7. Criteris de qualitat

- **Motor de càlcul**: 100% cobert amb tests unitaris. Zero dependències de React.
- **Precisió**: Arrodoniment a 2 decimals per a imports, validació que el quadre sencer suma correctament.
- **Persistència**: Totes les dades a LocalStorage, mai a cap servidor. Export/import com a JSON vàlid.
- **Accessibilitat**: Labels als formularis, taules amb headers semàntics.
- **Límits**: Màxim 6 préstecs, sense límit pràctic d'escenaris (però UI dissenyada per a ~5-10).

## 8. Convencions de codi

- Noms de variables i funcions en anglès (estàndard del sector)
- Textos visibles a l'usuari via claus i18n en català
- Fitxers i carpetes en anglès
- Tipus TypeScript strict (no `any`)
- Components funcionals amb hooks
- Lògica de càlcul separada de la UI (carpeta `engine/`)
